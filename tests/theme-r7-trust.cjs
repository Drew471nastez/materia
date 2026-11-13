/* Logos and trust, round 7: Logo Wall (logo-grid-heading) and Press
   Mentions (press-mentions).

   For both, at 375 and 1366, in the builder and on the storefront: the file
   and the schema, theme inheritance (with the theme's font priority on and
   off), every section and block control (live, back again, and after a
   server redraw, with the live result equal to the redrawn one), controls
   that belong to one width, every select option looking different, custom
   colours and fonts winning under the real theme rules and restoring the
   theme when off, two instances staying apart, an added block, redraws that
   set the section up once, logos kept on unrelated edits, first paint equal
   to the hydrated paint, the theme reveal, reduced motion, grey logos (in
   colour on hover, on keyboard focus and on a touch screen), the data each
   block shows (an empty logo a placeholder in the builder and nothing on the
   storefront), tap targets, headings, no overflow at 375 and no errors.
   Press Mentions cards on a phone: native scroller styles, touch-style
   scrollLeft, snapping, arrow keys, a tab stop only while it scrolls.

   LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-r7-trust.cjs [section ...] */
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const ROOT = path.join(__dirname, '..');
const FP = require('./theme-featured-product-round5.cjs');
if (!FP.Liquid) { console.log('trust round 7 skipped: liquidjs not installed (LIQUIDJS=<path to liquidjs>)'); return; }
const {launch, mount, render, schemaOf, schemaProblems, THEME_VARS} = require('./media-fixture.cjs');
const ASSET = 'live-r7-trust.js';
const only = process.argv.slice(2);

const pic = (n, alt = '') => ({url: 'https://theme.test/' + n + '.png', src: 'https://theme.test/' + n + '.png', width: 400, height: 160, alt});
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'};
const FONT2 = {family: 'Courier New', fallback_families: 'monospace'};
const logos = n => Array.from({length: n}, (_, i) => ({type: 'logo', settings: {logo: pic('logo-' + (i + 1)), alt: 'Logo ' + (i + 1), url: i % 2 ? '' : '/pages/stockists'}}));
const mentions = n => Array.from({length: n}, (_, i) => ({type: 'mention', settings: {logo: i === 1 ? '' : pic('press-' + (i + 1)), publication: 'Paper ' + (i + 1), title: 'A headline about the shop, number ' + (i + 1), date: i === 2 ? '' : 'Issue ' + (i + 1), url: i === 2 ? '' : 'https://press.test/article-' + (i + 1)}}));

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const near = (a, b, d = 1) => Math.abs(a - b) <= d;
const rgb = {bg: 'rgb(24, 32, 40)', heading: 'rgb(255, 255, 255)', text: 'rgb(204, 204, 204)', border: 'rgb(68, 85, 102)', altBg: 'rgb(250, 250, 250)', altHeading: 'rgb(16, 16, 16)', altText: 'rgb(51, 51, 51)', altBorder: 'rgb(221, 221, 221)'};

/* ------------------------------------------------------------ probes (run in the page) */
const PROBES = {
  'logo-grid-heading': uid => {
    const w = document.getElementById('shopify-section-' + uid), root = w.querySelector('.lw');
    if (!root) return {present: false};
    const cs = (el, k) => el ? getComputedStyle(el)[k] : null, r1 = n => Math.round(n * 2) / 2, top = root.getBoundingClientRect().top;
    const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return {x: r1(r.x), y: r1(r.y - top), w: r1(r.width), h: r1(r.height)}; };
    const h = root.querySelector('.lw__heading'), sub = root.querySelector('.lw__sub'), sp = sub && (sub.querySelector('p') || sub), grid = root.querySelector('.lw__grid'), items = [...root.querySelectorAll('.lw__item')];
    const tile = items[0] && items[0].querySelector('.lw__tile'), img = tile && tile.querySelector('img');
    return {present: true, display: cs(root, 'display'), scheme: [...root.classList].filter(c => c.startsWith('color-')).join(' '), spacing: root.classList.contains('remove_spacing'), width: root.dataset.width,
      bg: cs(root, 'backgroundColor'), pt: cs(root, 'paddingTop'), pb: cs(root, 'paddingBottom'), mt: cs(w, 'marginTop'), mb: cs(w, 'marginBottom'), ownFont: root.hasAttribute('data-own-font'),
      inner: box(root.querySelector('.lw__inner')), head: box(root.querySelector('.lw__head')),
      heading: h && {html: h.innerHTML, hidden: h.hidden || cs(h, 'display') === 'none', color: cs(h, 'color'), family: cs(h, 'fontFamily'), size: cs(h, 'fontSize'), weight: cs(h, 'fontWeight'), align: cs(h, 'textAlign'), box: box(h)},
      sub: sub && {html: sub.innerHTML, hidden: sub.hidden || cs(sub, 'display') === 'none', color: cs(sp, 'color'), family: cs(sp, 'fontFamily'), size: cs(sp, 'fontSize'), align: cs(sub, 'textAlign')},
      grid: grid && {box: box(grid), n: items.length, colGap: cs(grid, 'columnGap'), rowGap: cs(grid, 'rowGap'), justify: cs(grid, 'justifyContent')},
      items: items.slice(0, 8).map(box),
      tile: tile && {box: box(tile), tag: tile.tagName, href: tile.getAttribute('href'), bg: cs(tile, 'backgroundColor'), shadow: cs(tile, 'boxShadow'), radius: cs(tile, 'borderTopLeftRadius'),
        img: img ? img.getAttribute('src').replace(/\?.*$/, '') : null, alt: img ? img.getAttribute('alt') : null, ph: !!tile.querySelector('svg'), imgH: img ? Math.round(img.getBoundingClientRect().height) : null, filter: img ? cs(img, 'filter') : null, opacity: img ? cs(img, 'opacity') : null}};
  },
  'press-mentions': uid => {
    const w = document.getElementById('shopify-section-' + uid), root = w.querySelector('.pm');
    if (!root) return {present: false};
    const cs = (el, k) => el ? getComputedStyle(el)[k] : null, r1 = n => Math.round(n * 2) / 2, top = root.getBoundingClientRect().top;
    const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return {x: r1(r.x), y: r1(r.y - top), w: r1(r.width), h: r1(r.height)}; };
    const h = root.querySelector('.pm__heading'), sub = root.querySelector('.pm__sub'), sp = sub && (sub.querySelector('p') || sub), list = root.querySelector('.pm__list'), items = [...root.querySelectorAll('.pm__item')];
    const item = it => { if (!it) return null; const a = it.querySelector('.pm__link'), img = it.querySelector('.pm__img'), name = it.querySelector('.pm__name'), t = it.querySelector('.pm__title'), d = it.querySelector('.pm__date'), m = it.querySelector('.pm__more');
      return {box: box(it), border: cs(it, 'borderBottomColor'), borderL: cs(it, 'borderLeftWidth'), bg: cs(it, 'backgroundColor'), radius: cs(it, 'borderTopLeftRadius'), tag: a.tagName, href: a.getAttribute('href'),
        img: img ? img.getAttribute('src').replace(/\?.*$/, '') : null, alt: img ? img.getAttribute('alt') : null, imgH: img ? Math.round(img.getBoundingClientRect().height) : null, filter: img ? cs(img, 'filter') : null,
        name: name ? name.textContent : null, ph: !!it.querySelector('.pm__logo > svg'),
        title: {html: t.innerHTML, hidden: t.hidden || cs(t, 'display') === 'none', color: cs(t, 'color'), size: cs(t, 'fontSize'), family: cs(t, 'fontFamily'), weight: cs(t, 'fontWeight'), box: box(t)},
        date: {text: d.textContent, hidden: d.hidden || cs(d, 'display') === 'none', family: cs(d, 'fontFamily'), color: cs(d, 'color')},
        more: {text: m.textContent, shown: cs(m, 'display') !== 'none' && !m.hidden, color: cs(m, 'color'), box: box(m)}}; };
    return {present: true, display: cs(root, 'display'), scheme: [...root.classList].filter(c => c.startsWith('color-')).join(' '), spacing: root.classList.contains('remove_spacing'), width: root.dataset.width,
      bg: cs(root, 'backgroundColor'), pt: cs(root, 'paddingTop'), pb: cs(root, 'paddingBottom'), mt: cs(w, 'marginTop'), mb: cs(w, 'marginBottom'), ownFont: root.hasAttribute('data-own-font'),
      inner: box(root.querySelector('.pm__inner')),
      heading: h && {html: h.innerHTML, hidden: h.hidden || cs(h, 'display') === 'none', color: cs(h, 'color'), family: cs(h, 'fontFamily'), size: cs(h, 'fontSize'), weight: cs(h, 'fontWeight'), align: cs(h, 'textAlign'), box: box(h)},
      sub: sub && {html: sub.innerHTML, hidden: sub.hidden || cs(sub, 'display') === 'none', color: cs(sp, 'color'), family: cs(sp, 'fontFamily'), size: cs(sp, 'fontSize')},
      list: list && {box: box(list), display: cs(list, 'display'), overflowX: cs(list, 'overflowX'), n: items.length},
      items: items.slice(0, 4).map(box), first: item(items[0]), second: item(items[1]), third: item(items[2])};
  },
};
const probe = (t, name, uid = 'test') => t.page.evaluate(PROBES[name], uid);
/* Two frames for the controller's one paint per frame, then any transition is run to its end. */
const frames = (t, n = 2) => t.page.evaluate(n => new Promise(r => { const f = () => n-- > 0 ? requestAnimationFrame(f) : (document.getAnimations().forEach(a => { try { a.finish(); } catch (_) {} }), requestAnimationFrame(() => r())); f(); }), n);

/* ------------------------------------------------------------ what every control must do */
const CUSTOM = {enable_custom_style: true};
const common = W => ({
  color_scheme: {v: 'alt-scheme', ok: q => q.scheme === 'color-alt-scheme' && q.bg === rgb.altBg && q.heading.color === rgb.altHeading},
  reset_spacing: {v: false, pre: {section_margin_top_desktop: 40, section_margin_top_mobile: 20, section_margin_bottom_desktop: 36, section_margin_bottom_mobile: 16}, ok: q => q.mt === (W === 375 ? '20px' : '40px') && q.mb === (W === 375 ? '16px' : '36px') && q.spacing === false},
  enable_custom_style: {v: true, pre: {section_bg: '#abcdef'}, ok: q => q.bg === 'rgb(171, 205, 239)'},
  section_bg: {v: '#abcdef', pre: CUSTOM, ok: q => q.bg === 'rgb(171, 205, 239)'},
  padding_top: {v: 100, at: 1366, ok: q => q.pt === '100px'},
  padding_bottom: {v: 120, at: 1366, ok: q => q.pb === '120px'},
  section_margin_top_desktop: {v: 40, at: 1366, pre: {reset_spacing: false}, ok: q => q.mt === '40px'},
  section_margin_bottom_desktop: {v: 44, at: 1366, pre: {reset_spacing: false}, ok: q => q.mb === '44px'},
  padding_top_mobile: {v: 10, at: 375, ok: q => q.pt === '10px'},
  padding_bottom_mobile: {v: 90, at: 375, ok: q => q.pb === '90px'},
  section_margin_top_mobile: {v: 24, at: 375, pre: {reset_spacing: false}, ok: q => q.mt === '24px'},
  section_margin_bottom_mobile: {v: 28, at: 375, pre: {reset_spacing: false}, ok: q => q.mb === '28px'},
});
const textBlocks = (h, s) => ({
  heading: {
    text: {v: h, ok: q => q.heading.html === h && !q.heading.hidden},
    enable_custom_style: {v: true, pre: {color: '#ff0000'}, ok: q => q.heading.color === 'rgb(255, 0, 0)'},
    color: {v: '#00ff00', pre: CUSTOM, ok: q => q.heading.color === 'rgb(0, 255, 0)'},
    size_desktop: {v: 48, at: 1366, ok: q => q.heading.size === '48px'},
    size_mobile: {v: 20, at: 375, ok: q => q.heading.size === '20px'},
  },
  subheading: {
    text: {v: s, ok: q => q.sub.html === s && !q.sub.hidden},
    enable_custom_style: {v: true, pre: {color: '#ff0000'}, ok: q => q.sub.color === 'rgb(255, 0, 0)'},
    color: {v: '#00ff00', pre: CUSTOM, ok: q => q.sub.color === 'rgb(0, 255, 0)'},
    size_desktop: {v: 22, at: 1366, ok: q => q.sub.size === '22px'},
    size_mobile: {v: 12, at: 375, ok: q => q.sub.size === '12px'},
  },
});
const rowsOf = items => new Set(items.map(b => b.y)).size;
const CFG = {
  'logo-grid-heading': {
    p: 'lw', blocks: () => [{type: 'heading'}, {type: 'subheading'}, ...logos(8)], few: () => [{type: 'heading'}, {type: 'subheading'}, ...logos(3)],
    section: W => ({...common(W),
      section_width: {v: 'container', ok: (q, b) => q.width === 'container' && (W === 1366 ? q.inner.w < b.inner.w - 20 : true)},
      alignment: {v: 'left', ok: q => q.heading.align === 'start' && q.grid.justify === 'flex-start'},
      columns: {v: 3, at: 1366, ok: q => q.items[2].y === q.items[0].y && q.items[3].y > q.items[0].y},
      tile_style: {v: 'tiles', ok: q => q.tile.bg !== 'rgba(0, 0, 0, 0)' && q.tile.shadow === 'none' && q.tile.radius === '8px'},
      logo_height: {v: 80, at: 1366, ok: q => q.tile.imgH === 80},
      logo_style: {v: 'mono', ok: q => q.tile.filter === 'grayscale(1)' && q.tile.opacity === '0.62'},
      line_color: {v: '#00ff88', pre: CUSTOM, ok: q => q.tile.shadow.includes('rgb(0, 255, 136)')},
      tile_bg: {v: '#112233', pre: {...CUSTOM, tile_style: 'tiles'}, ok: q => q.tile.bg === 'rgb(17, 34, 51)'},
      enable_custom_fonts: {v: true, pre: {heading_font: FONT, body_font: FONT2}, ok: q => /Verdana/.test(q.heading.family) && /Courier/.test(q.sub.family) && q.ownFont},
      heading_font: {v: FONT, pre: {enable_custom_fonts: true}, ok: q => /Verdana/.test(q.heading.family) && !/Verdana/.test(q.sub.family)},
      body_font: {v: FONT2, pre: {enable_custom_fonts: true}, ok: q => /Courier/.test(q.sub.family) && !/Courier/.test(q.heading.family)},
      columns_mobile: {v: 3, at: 375, ok: q => q.items[2].y === q.items[0].y && q.items[3].y > q.items[0].y},
      logo_height_mobile: {v: 48, at: 375, ok: q => q.tile.imgH === 48},
    }),
    block: {
      ...textBlocks('Stocked <em>here</em>', '<p>The shops that carry our range.</p>'),
      logo: {
        logo: {v: pic('own-logo'), ok: q => q.tile.img === 'https://theme.test/own-logo.png'},
        alt: {v: 'North Street Store', ok: q => q.tile.alt === 'North Street Store'},
        url: {v: 'https://shop.test/stockist', ok: q => q.tile.href === 'https://shop.test/stockist' && q.tile.tag === 'A'},
      },
    },
    selects: {section_width: [1366], alignment: [0], tile_style: [0], logo_style: [0]},
  },
  'press-mentions': {
    p: 'pm', blocks: () => [{type: 'heading'}, {type: 'subheading'}, ...mentions(4)], few: () => [{type: 'heading'}, {type: 'subheading'}, ...mentions(3)],
    section: W => ({...common(W),
      section_width: {v: 'container', ok: (q, b) => q.width === 'container' && (W === 1366 ? q.inner.w < b.inner.w - 20 : true)},
      link_label: {v: 'See the piece', ok: q => q.first.more.text === 'See the piece' && q.first.more.shown && !q.third.more.shown},
      alignment: {v: 'left', ok: q => q.heading.align === 'start'},
      layout: {v: 'cards', ok: q => q.first.borderL === '1px' && q.first.radius === '8px'},
      columns: {v: 2, at: 1366, pre: {layout: 'cards'}, ok: q => q.items[1].y === q.items[0].y && q.items[2].y > q.items[0].y},
      logo_height: {v: 40, at: 1366, ok: q => q.first.imgH === 40},
      logo_style: {v: 'mono', ok: q => q.first.filter === 'grayscale(1)'},
      title_color: {v: '#ff8800', pre: CUSTOM, ok: q => q.first.title.color === 'rgb(255, 136, 0)' && q.first.more.color === 'rgb(255, 136, 0)'},
      line_color: {v: '#00ff88', pre: CUSTOM, ok: q => q.first.border === 'rgb(0, 255, 136)'},
      card_bg: {v: '#112233', pre: {...CUSTOM, layout: 'cards'}, ok: q => q.first.bg === 'rgb(17, 34, 51)'},
      title_size: {v: 28, at: 1366, ok: q => q.first.title.size === '28px'},
      enable_custom_fonts: {v: true, pre: {heading_font: FONT, body_font: FONT2}, ok: q => /Verdana/.test(q.heading.family) && /Verdana/.test(q.first.title.family) && /Courier/.test(q.sub.family) && /Courier/.test(q.first.date.family) && q.ownFont},
      heading_font: {v: FONT, pre: {enable_custom_fonts: true}, ok: q => /Verdana/.test(q.first.title.family) && !/Verdana/.test(q.first.date.family)},
      body_font: {v: FONT2, pre: {enable_custom_fonts: true}, ok: q => /Courier/.test(q.first.date.family) && !/Courier/.test(q.first.title.family)},
      mobile_layout: {v: 'stack', at: 375, pre: {layout: 'cards'}, ok: q => q.list.overflowX === 'visible' && q.items[1].y > q.items[0].y && near(q.items[0].w, q.list.box.w)},
      logo_height_mobile: {v: 40, at: 375, ok: q => q.first.imgH === 40},
      title_size_mobile: {v: 24, at: 375, ok: q => q.first.title.size === '24px'},
    }),
    block: {
      ...textBlocks('In <em>print</em>', '<p>Where the shop has been written about.</p>'),
      mention: {
        logo: {v: pic('own-press'), ok: q => q.first.img === 'https://theme.test/own-press.png'},
        publication: {v: 'The Weekly', ok: q => q.first.alt === 'The Weekly'},
        title: {v: 'A <em>small</em> shop', ok: q => q.first.title.html === 'A <em>small</em> shop' && !q.first.title.hidden},
        date: {v: 'Winter issue', ok: q => q.first.date.text === 'Winter issue' && !q.first.date.hidden},
        url: {v: 'https://press.test/other', ok: q => q.first.href === 'https://press.test/other'},
      },
    },
    selects: {section_width: [1366], alignment: [0], layout: [0], logo_style: [0], mobile_layout: [375, {layout: 'cards'}]},
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
  eq(Object.keys(JSON.parse(raw.split('<schema>')[1].split('</schema>')[0])), ['shopify'], name + ': the schema holds only the theme\'s own object');
  eq(schemaProblems(name), [], name + ': schema problems');
  ok(s.name.length <= 25, name + ': name fits the builder');
  const others = fs.readdirSync(path.join(ROOT, 'sections')).filter(f => f.endsWith('.storelib') && f !== name + '.storelib').filter(f => { try { return schemaOf(f.slice(0, -9)).schema.name === s.name; } catch (_) { return false; } });
  eq(others, [], name + ': no other section has this name');
  eq([s.presets[0].name, s.presets[0].category], [s.name, 'Logos and trust'], name + ': preset name and category');
  const order = s.settings.filter(x => x.type === 'header').map(x => x.content);
  const want = ['General', 'Content', 'Layout', 'Images', 'Appearance', 'Typography', 'Animation', 'Desktop spacing', 'Mobile'].filter(x => order.includes(x));
  eq(order, want, name + ': groups in the shared order');
  eq(s.settings.filter(x => x.id).slice(0, 3).map(x => x.id), ['color_scheme', 'section_width', 'reset_spacing'], name + ': General group');
  /* the category's own controls, copied: section width and spacing (Brand logo, Scrolling Logo Strip, Brand info), heading and text blocks */
  const strip = schemaOf('logo_scroll_strip').schema, brand = schemaOf('brand-logo').schema, info = schemaOf('brand-info').schema, mine = s.settings, find = (l, id) => l.find(x => x.id === id);
  const bare = x => { const {visible_if, ...r} = x; void visible_if; return r; };
  for (const id of ['section_width', 'reset_spacing', 'section_margin_top_desktop', 'section_margin_bottom_desktop', 'section_margin_top_mobile', 'section_margin_bottom_mobile']) {
    const theirs = find(brand.settings, id), m = find(mine, id);
    eq(id === 'section_width' ? [m.default, m.options] : [m.min, m.max, m.step, m.default, m.unit], id === 'section_width' ? [theirs.default, theirs.options] : [theirs.min, theirs.max, theirs.step, theirs.default, theirs.unit], name + ': ' + id + ' matches Brand logo');
  }
  for (const id of ['padding_top', 'padding_bottom']) eq(bare(find(mine, id)), find(strip.settings, id), name + ': ' + id + ' matches Scrolling Logo Strip');
  for (const id of ['padding_top_mobile', 'padding_bottom_mobile']) eq(bare(find(mine, id)), find(info.settings, id), name + ': ' + id + ' matches Brand info');
  for (const t of ['heading', 'subheading']) {
    const theirs = strip.blocks.find(b => b.type === t).settings.filter(x => x.id && !x.hidden).map(x => ({...x, default: undefined})), m = s.blocks.find(b => b.type === t).settings.filter(x => x.id).map(x => ({...x, default: undefined}));
    eq(m, theirs, name + ': the ' + t + ' block has the category\'s own settings');
  }
  /* every picture is an image picker; nothing typed in a default that a creator did not write */
  for (const b of s.blocks) for (const x of b.settings) if (/logo|image|picture/.test(x.id || '')) eq(x.type, 'image_picker', name + ': ' + b.type + '.' + x.id + ' is an image picker');
  const words = JSON.stringify(s) + raw.split('<schema>')[0].replace(/\{%-?\s*comment[\s\S]*?endcomment\s*-?%\}/g, '');
  ok(!/—|–/.test(words), name + ': no dashes in copy');
  ok(!/\b(unlock|elevate|seamless|powerful|effortlessly|supercharge|transform)\b/i.test(JSON.stringify(s)), name + ': no banned words');
  ok(!/\d/.test(JSON.stringify(s.blocks.map(b => b.settings.filter(x => x.type !== 'range').map(x => x.default || '')))), name + ': no number (rating, count, price, date) in a block default');
  ok(!/<link\b|<iframe\b|onclick=|fetch\(/i.test(raw), name + ': no link, iframe, inline handler or fetch');
  const css = raw.split('<schema>')[0].match(/<style[^>]*>[\s\S]*?<\/style>/g).join('\n');
  eq(css.match(/#[0-9a-fA-F]{3,8}\b/g) || [], [], name + ': no hard-coded colours');
  ok(!/linear-gradient|radial-gradient|backdrop-filter/.test(css), name + ': no gradient or glass');
  /* every schema id is covered by this test */
  const cfg = CFG[name], sec = cfg.section(1366);
  eq(visible(s.settings).map(x => x.id).filter(id => !sec[id]), [], name + ': every section setting has a check');
  for (const b of s.blocks) eq(visible(b.settings).map(x => x.id).filter(id => !(cfg.block[b.type] || {})[id]), [], name + ': every ' + b.type + ' setting has a check');
}

/* ------------------------------------------------------------ every control, live and redrawn */
async function controls(browser, name, W, editing) {
  const cfg = CFG[name], s = schemaOf(name).schema, tag = `${name} ${W} ${editing ? 'builder' : 'storefront'}`;
  const t = await mount(browser, name, {width: W, editing, blocks: cfg.blocks(), assets: [ASSET]});
  const base = await probe(t, name);
  ok(base.present, tag + ': draws');
  eq(await t.page.evaluate(() => !!document.querySelector('[data-r7t-settings]')), editing, tag + ': settings JSON only in the builder');
  const orig = t.section;
  const run = async (id, spec, block) => {
    const where = block ? block + '.' + id : id, bid = block ? t.blockId(block) : undefined;
    const from = block ? orig.blocks.find(b => b.id === bid).settings : orig.settings;
    const change = {...(spec.pre || {}), [id]: spec.v}, back = Object.fromEntries(Object.keys(change).map(k => [k, from[k] === undefined ? '' : from[k]]));
    const want = !spec.at || spec.at === W;
    let live = null;
    if (editing) {
      await t.emit(change, bid); await frames(t);
      live = await probe(t, name);
      eq(!!spec.ok(live, base), want, `${tag}: ${where} live ${want ? 'changes its element' : 'leaves this width alone'}`);
      await t.emit(back, bid); await frames(t);
      eq(await probe(t, name), base, `${tag}: ${where} back to the start, live`);
    }
    const blocksWith = set => orig.blocks.map(b => ({type: b.type, settings: b.id === bid ? {...b.settings, ...set} : b.settings}));
    await t.redraw(block ? {blocks: blocksWith(change)} : {settings: {...orig.settings, ...change}}); await frames(t);
    const drawn = await probe(t, name);
    eq(!!spec.ok(drawn, base), want, `${tag}: ${where} redrawn ${want ? 'changes its element' : 'leaves this width alone'}`);
    if (live) eq(live, drawn, `${tag}: ${where} live equals the redraw`);
    await t.redraw(block ? {blocks: blocksWith({})} : {settings: orig.settings}); await frames(t);
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
  const cfg = CFG[name], tag = `${name} ${W} ${editing ? 'builder' : 'storefront'}`, m = name === 'press-mentions';
  for (const priority of [true, 'off']) {
    const t = await mount(browser, name, {width: W, editing, blocks: cfg.blocks(), assets: [ASSET], priority});
    const q = await probe(t, name);
    eq([q.bg, q.heading.color, q.sub.color], [rgb.bg, rgb.heading, rgb.text], `${tag} priority ${priority}: scheme colours`);
    ok(/Georgia/.test(q.heading.family) && /Arial/.test(q.sub.family), `${tag} priority ${priority}: theme heading and body fonts`);
    eq(q.heading.weight, '700', `${tag} priority ${priority}: theme heading weight`);
    if (m) {
      eq([q.first.title.color, q.first.title.weight, q.first.border, q.first.date.color, q.first.more.color], [rgb.heading, '700', rgb.border, rgb.text, rgb.heading], `${tag} priority ${priority}: headlines, lines and dates follow the scheme`);
      ok(/Georgia/.test(q.first.title.family) && /Arial/.test(q.first.date.family), `${tag} priority ${priority}: headlines in the heading font, dates in the body font`);
    } else ok(q.tile.shadow.includes(rgb.border), `${tag} priority ${priority}: the lines are the scheme border`);
    eq(t.errors, [], `${tag} priority ${priority}: no errors`);
    await t.page.close();
  }
  /* scheme switch, live and redrawn; custom fonts on an element and a descendant under the real theme rules, then off */
  const t = await mount(browser, name, {width: W, editing, blocks: cfg.blocks().map(b => b.type === 'heading' ? {...b, settings: {text: 'Seen <em>here</em>'}} : b), assets: [ASSET]});
  await t.emit({color_scheme: 'alt-scheme'}); await frames(t);
  let q = await probe(t, name);
  eq([q.bg, q.heading.color, q.sub.color], [rgb.altBg, rgb.altHeading, rgb.altText], tag + ': alternate scheme, live');
  if (m) eq([q.first.title.color, q.first.border], [rgb.altHeading, rgb.altBorder], tag + ': headlines and lines follow the scheme');
  else ok(q.tile.shadow.includes(rgb.altBorder), tag + ': lines follow the scheme');
  await t.redraw({settings: {color_scheme: 'alt-scheme'}}); await frames(t);
  eq(await probe(t, name), q, tag + ': alternate scheme, redrawn');
  await t.redraw({settings: {color_scheme: 'default-color-scheme'}}); await frames(t);
  const fonts = {enable_custom_fonts: true, heading_font: FONT, body_font: FONT2};
  const families = () => t.page.evaluate(p => { const r = document.querySelector('#shopify-section-test .' + p), f = el => el ? getComputedStyle(el).fontFamily : ''; return {em: f(r.querySelector('.' + p + '__heading em')), h: f(r.querySelector('.' + p + '__heading')), sub: f(r.querySelector('.' + p + '__sub p')), title: f(r.querySelector('.pm__title')), date: f(r.querySelector('.pm__date'))}; }, cfg.p);
  for (const how of ['live', 'redrawn']) {
    if (how === 'live') await t.emit(fonts); else await t.redraw({settings: fonts});
    await frames(t);
    const f = await families();
    ok(/Verdana/.test(f.h) && /Verdana/.test(f.em) && (!m || /Verdana/.test(f.title)), `${tag}: custom heading font wins on the heading, its <em>${m ? ' and the headlines' : ''}, ${how}`);
    ok(/Courier/.test(f.sub) && (!m || /Courier/.test(f.date)), `${tag}: custom text font wins on the text's <p>${m ? ' and the dates' : ''}, ${how}`);
    const off = {enable_custom_fonts: false};
    if (how === 'live') await t.emit(off); else await t.redraw({settings: off});
    await frames(t);
    const g = await families();
    ok(/Georgia/.test(g.h) && /Georgia/.test(g.em) && /Arial/.test(g.sub) && (!m || /Georgia/.test(g.title) && /Arial/.test(g.date)), `${tag}: fonts off restores the theme, ${how}`);
  }
  await t.redraw({settings: {enable_custom_fonts: false, heading_font: 'assistant_n4', body_font: 'assistant_n4'}}); await frames(t);
  /* custom styling on with every colour, then off: exactly the theme again */
  const colours = m ? {enable_custom_style: true, section_bg: '#abcdef', title_color: '#ff8800', line_color: '#00ff88', card_bg: '#112233', layout: 'cards'} : {enable_custom_style: true, section_bg: '#abcdef', line_color: '#00ff88', tile_bg: '#112233'};
  const read = q => m ? [q.bg, q.first.title.color, q.first.border, q.first.bg] : [q.bg, q.tile.shadow.includes('rgb(0, 255, 136)')];
  for (const how of ['live', 'redrawn']) {
    if (how === 'live') await t.emit(colours); else await t.redraw({settings: colours});
    await frames(t);
    q = await probe(t, name);
    eq(read(q), m ? ['rgb(171, 205, 239)', 'rgb(255, 136, 0)', 'rgb(0, 255, 136)', 'rgb(17, 34, 51)'] : ['rgb(171, 205, 239)', true], `${tag}: every custom colour lands, ${how}`);
    if (!m) {
      const tiles = {tile_style: 'tiles'};
      if (how === 'live') await t.emit(tiles); else await t.redraw({settings: tiles});
      await frames(t);
      eq((await probe(t, name)).tile.bg, 'rgb(17, 34, 51)', `${tag}: the tile colour lands, ${how}`);
      if (how === 'live') await t.emit({tile_style: 'lines'}); else await t.redraw({settings: {tile_style: 'lines'}});
      await frames(t);
    }
    eq(q.heading.color, rgb.heading, `${tag}: the heading keeps the scheme colour, ${how}`);
    /* an empty custom colour is the theme's */
    const empty = {section_bg: '', line_color: 'rgba(0, 0, 0, 0)', title_color: ''};
    if (how === 'live') await t.emit(empty); else await t.redraw({settings: empty});
    await frames(t);
    q = await probe(t, name);
    eq(m ? [q.bg, q.first.title.color, q.first.border] : [q.bg, q.tile.shadow.includes(rgb.border)], m ? [rgb.bg, rgb.heading, rgb.border] : [rgb.bg, true], `${tag}: an empty custom colour falls back to the scheme, ${how}`);
    const off = {enable_custom_style: false};
    const reset = {section_bg: '', title_color: '', line_color: '', card_bg: '', tile_bg: '', layout: 'list'};
    if (how === 'live') await t.emit(m ? {...off, card_bg: '#112233'} : off); else await t.redraw({settings: {...off, line_color: '#00ff88', tile_bg: '#112233', card_bg: '#112233', title_color: '#ff8800'}});
    await frames(t);
    q = await probe(t, name);
    eq(m ? [q.bg, q.first.title.color, q.first.border, q.first.bg] : [q.bg, q.tile.shadow.includes(rgb.border)], m ? [rgb.bg, rgb.heading, rgb.border, 'rgba(0, 0, 0, 0)'] : [rgb.bg, true], `${tag}: custom styling off restores the theme, ${how}`);
    if (how === 'live') await t.emit(reset); else await t.redraw({settings: reset});
    await frames(t);
  }
  /* a blank heading hides; the header goes when nothing is in it */
  await t.emit({text: ''}, t.blockId('heading')); await frames(t);
  q = await probe(t, name);
  ok(q.heading.hidden && !q.sub.hidden, tag + ': an empty heading is hidden, the text stays');
  await t.emit({text: ''}, t.blockId('subheading')); await frames(t);
  ok(await t.page.evaluate(p => getComputedStyle(document.querySelector('#shopify-section-test .' + p + '__head')).display === 'none', cfg.p), tag + ': the header goes when it is empty');
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();
}

/* ------------------------------------------------------------ select options look different */
async function selects(browser, name, W) {
  const cfg = CFG[name], s = schemaOf(name).schema, tag = `${name} ${W}`;
  for (const [id, [only, pre = {}]] of Object.entries(cfg.selects)) {
    if (only && only !== W) continue;
    const t = await mount(browser, name, {width: W, editing: true, blocks: cfg.few(), settings: {alignment: 'left', ...pre}, assets: [ASSET]});
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
    eq(t.errors, [], tag + ': ' + id + ': no errors');
    await t.page.close();
  }
}

/* ------------------------------------------------------------ lifecycle */
async function lifecycle(browser, name, W) {
  const cfg = CFG[name], tag = `${name} ${W}`, m = name === 'press-mentions', block = m ? 'mention' : 'logo';
  /* two instances */
  const t = await mount(browser, name, {width: W, editing: true, instances: [{uid: 'a', blocks: cfg.blocks()}, {uid: 'b', blocks: cfg.blocks()}], assets: [ASSET]});
  const b0 = await probe(t, name, 'b');
  await t.emit({enable_custom_style: true, section_bg: '#abcdef', padding_top: 12, padding_top_mobile: 12, color_scheme: 'alt-scheme'}, undefined, 'a'); await frames(t);
  await t.emit({text: 'Only in A'}, t.blockId('heading', 0, 'a'), 'a'); await frames(t);
  await t.emit(m ? {title: 'Headline in A'} : {logo: pic('only-a')}, t.blockId(block, 0, 'a'), 'a'); await frames(t);
  const a1 = await probe(t, name, 'a');
  ok(a1.bg === 'rgb(171, 205, 239)' && a1.pt === '12px' && a1.heading.html === 'Only in A' && (m ? a1.first.title.html === 'Headline in A' : /only-a/.test(a1.tile.img)), tag + ': the edits land in instance A');
  eq(await probe(t, name, 'b'), b0, tag + ': instance B is untouched');
  eq(await t.page.evaluate(() => window.MateriaR7Trust.count()), 2, tag + ': two roots');
  /* other shapes of the event: an object, a prefixed id, blockId */
  await t.page.evaluate(() => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {section: {id: 'b'}, settings: {padding_bottom: 8, padding_bottom_mobile: 8}, live: true}})));
  await t.page.evaluate(id => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {section: 'shopify-section-b', blockId: id, settings: {text: 'Only in B'}, live: false}})), t.blockId('heading', 0, 'b'));
  await frames(t, 3);
  const b2 = await probe(t, name, 'b');
  ok(b2.pb === '8px' && b2.heading.html === 'Only in B', tag + ': section as an object, a prefixed id and blockId are understood');
  eq((await probe(t, name, 'a')).heading.html, 'Only in A', tag + ': and A keeps its own');
  /* a change with no section (a theme setting) is not ours */
  await t.page.evaluate(() => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {settings: {padding_top: 199, padding_top_mobile: 199}, live: true}})));
  await frames(t);
  eq((await probe(t, name, 'a')).pt, '12px', tag + ': a theme setting change is left alone');
  eq(t.errors, [], tag + ': no errors with two instances');
  await t.page.close();

  /* logos on unrelated edits; an added block; redraws set up once */
  const u = await mount(browser, name, {width: W, editing: true, blocks: cfg.blocks(), assets: [ASSET]});
  const imgSel = '#shopify-section-test .' + cfg.p + '__img';
  await u.page.evaluate(sel => { const i = document.querySelector(sel); i.__kept = true; window.__src = i.getAttribute('src'); window.__srcset = i.getAttribute('srcset'); }, imgSel);
  await u.emit({padding_top: 20, padding_top_mobile: 20, enable_custom_style: true, line_color: '#ff8800', logo_style: 'mono', columns: 4, columns_mobile: 3, title_size: 22, layout: 'list'}); await frames(u);
  await u.emit({text: 'Edited'}, u.blockId('heading')); await frames(u);
  await u.emit(m ? {title: 'Edited headline', date: 'Edited issue', url: 'https://press.test/edited'} : {alt: 'Edited', url: 'https://shop.test/edited'}, u.blockId(block)); await frames(u);
  eq(await u.page.evaluate(sel => { const i = document.querySelector(sel); return [i.__kept === true, i.getAttribute('src') === window.__src, i.getAttribute('srcset') === window.__srcset]; }, imgSel), [true, true, true], tag + ': the logo is the same element with the same address after unrelated edits');
  /* one block's logo changes only that block, and clearing it brings the placeholder (or the name) */
  const second = u.blockId(block, 2);
  await u.emit({logo: pic('third-own')}, second); await frames(u);
  eq(await u.page.evaluate(({sel, id}) => { const i = document.querySelector(sel), j = document.querySelector('[data-r7t-block="' + id + '"] img'); return [i.__kept === true, i.getAttribute('src') === window.__src, /third-own\.png/.test(j.getAttribute('src'))]; }, {sel: imgSel, id: second}), [true, true, true], tag + ': one block\'s logo changes, the others stay');
  await u.emit({logo: ''}, second); await frames(u);
  eq(await u.page.evaluate(id => { const b = document.querySelector('[data-r7t-block="' + id + '"]'); return [!!b.querySelector('img'), !!b.querySelector('svg.lg__ph'), b.querySelector('.pm__name') ? b.querySelector('.pm__name').textContent : null]; }, second), m ? [false, false, 'Paper 3'] : [false, true, null], tag + ': clearing a logo shows ' + (m ? 'the publication name' : 'the placeholder'));
  if (m) {
    await u.emit({publication: ''}, second); await frames(u);
    ok(await u.page.evaluate(id => !!document.querySelector('[data-r7t-block="' + id + '"] svg.lg__ph'), second), tag + ': with no name either, the placeholder');
    await u.emit({publication: 'Back again'}, second); await frames(u);
    eq(await u.page.evaluate(id => document.querySelector('[data-r7t-block="' + id + '"] .pm__name').textContent, second), 'Back again', tag + ': and a name replaces the placeholder');
  }
  /* added block */
  const added = m ? {type: 'mention', settings: {title: 'An added mention', url: 'https://press.test/added'}} : {type: 'logo', settings: {logo: pic('added'), alt: 'Added', url: '/pages/added'}};
  const before = await u.page.evaluate(b => document.querySelectorAll('[data-r7t-type="' + b + '"]').length, block);
  const blocks = cfg.blocks().concat([added]);
  await u.redraw({blocks}); await frames(u);
  const newId = 'test-b' + (blocks.length - 1);
  ok(await u.page.evaluate(({id, m}) => { const b = document.querySelector('[data-r7t-block="' + id + '"]'); return !!b && (m ? /An added mention/.test(b.textContent) && b.querySelector('a').getAttribute('href') === 'https://press.test/added' : /added\.png/.test(b.querySelector('img').getAttribute('src')) && b.querySelector('a').getAttribute('href') === '/pages/added'); }, {id: newId, m}), tag + ': an added block draws');
  eq(await u.page.evaluate(b => document.querySelectorAll('[data-r7t-type="' + b + '"]').length, block), before + 1, tag + ': one more ' + block);
  await u.emit({logo: pic('added-own')}, newId); await frames(u);
  ok(await u.page.evaluate(id => /added-own\.png/.test(document.querySelector('[data-r7t-block="' + id + '"] img').getAttribute('src')), newId), tag + ': the added block is live');
  for (let i = 0; i < 3; i++) await u.redraw();
  await frames(u);
  eq(await u.page.evaluate(() => [window.MateriaR7Trust.count(), document.querySelectorAll('[data-r7t]').length]), [1, 1], tag + ': redraws leave one root set up');
  /* a section swapped in with no event is found too */
  await u.page.evaluate(() => { const w = document.getElementById('shopify-section-test'), html = w.innerHTML; w.innerHTML = ''; w.innerHTML = html; });
  await frames(u, 4);
  eq(await u.page.evaluate(() => [window.MateriaR7Trust.count(), [...window.MateriaR7Trust.roots.keys()].every(r => r.isConnected)]), [1, true], tag + ': a section put in without an event is picked up, the old one dropped');
  await u.emit({padding_top: 44, padding_top_mobile: 44}); await frames(u);
  eq((await probe(u, name)).pt, '44px', tag + ': and it is live');
  if (m && W === 375) {
    /* one key press, one scroll call: listeners are not doubled by redraws */
    await u.redraw({settings: {layout: 'cards', mobile_layout: 'swipe'}}); await u.redraw(); await frames(u, 3);
    await u.page.evaluate(() => { window.__calls = 0; const o = Element.prototype.scrollBy; Element.prototype.scrollBy = function (...a) { window.__calls++; return o.apply(this, a); }; });
    await u.root('[data-r7t-track]').focus();
    await u.page.keyboard.press('ArrowRight');
    eq(await u.page.evaluate(() => window.__calls), 1, tag + ': one key press scrolls once after several redraws');
  }
  eq(u.errors, [], tag + ': no errors in the lifecycle');
  await u.page.close();
}

/* ------------------------------------------------------------ first paint, reveal, reduced motion, grey logos, data, phone feel */
async function paint(browser, name, W, editing) {
  const cfg = CFG[name], tag = `${name} ${W} ${editing ? 'builder' : 'storefront'}`, m = name === 'press-mentions';
  for (const extra of m ? [{}, {layout: 'cards'}] : [{}, {tile_style: 'tiles', logo_style: 'mono'}]) {
    const raw = await mount(browser, name, {width: W, editing, settings: extra, blocks: cfg.blocks(), assets: [], inlineScripts: false});
    const first = await probe(raw, name);
    await raw.page.close();
    const t = await mount(browser, name, {width: W, editing, settings: extra, blocks: cfg.blocks(), assets: [ASSET]});
    eq(await probe(t, name), first, tag + ': first paint equals the hydrated paint ' + JSON.stringify(extra));
    await t.page.close();
  }
  const t = await mount(browser, name, {width: W, editing, blocks: cfg.blocks(), assets: [ASSET]});
  /* tap targets, headings, pictures */
  eq(await t.page.evaluate(p => [...document.querySelectorAll('#shopify-section-test a.' + p + (p === 'lw' ? '__tile' : '__link') + '[href]')].map(a => a.getBoundingClientRect()).filter(r => r.width < 44 || r.height < 44).length, cfg.p), 0, tag + ': every link is at least 44px');
  eq(await t.page.evaluate(() => [document.querySelectorAll('#shopify-section-test h1').length, document.querySelectorAll('#shopify-section-test h2').length, document.querySelectorAll('#shopify-section-test h3').length]), [0, 1, m ? 4 : 0], tag + ': one h2, ' + (m ? 'an h3 per mention' : 'no other headings'));
  ok(await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test img')].every(i => i.getAttribute('loading') === 'lazy' && i.hasAttribute('width') && i.hasAttribute('height') && i.getAttribute('alt').length > 0)), tag + ': every logo is lazy, sized and described');
  ok(await t.noOverflow(), tag + ': no sideways page scroll');
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();

  /* the theme's reveal on scroll: the hook is on the section, nothing is hidden, a live edit does not play it again */
  const a = await mount(browser, name, {width: W, editing, blocks: cfg.blocks(), assets: [ASSET], theme: {scroll_animation: 'fade_up'}});
  const reveal = () => a.page.evaluate(() => { const w = document.getElementById('shopify-section-test'); return [w.classList.contains('scroll-trigger'), w.classList.contains('fade_up'), getComputedStyle(w).opacity, w.getAnimations().length]; });
  eq(await reveal(), [true, true, '1', 0], tag + ': the theme reveal hook is on the section and the content shows');
  await a.emit({padding_top: 20, padding_top_mobile: 20}); await frames(a);
  eq(await reveal(), [true, true, '1', 0], tag + ': an edit does not replay the reveal');
  eq(a.errors, [], tag + ': no errors with the theme reveal');
  await a.page.close();

  /* grey logos: colour on hover (a mouse), on keyboard focus, and always on a touch screen; reduced motion: no transitions */
  const g = await mount(browser, name, {width: W, editing, settings: {logo_style: 'mono'}, blocks: cfg.blocks(), assets: [ASSET], reducedMotion: 'reduce'});
  const imgSel = '#shopify-section-test .' + cfg.p + '__img', linkSel = '#shopify-section-test a.' + (m ? 'pm__link' : 'lw__tile') + '[href]';
  const look = () => g.page.evaluate(sel => { const i = document.querySelector(sel); return [getComputedStyle(i).filter, getComputedStyle(i).transitionDuration.split(',')[0].trim()]; }, imgSel);
  eq(await look(), ['grayscale(1)', '0s'], tag + ': grey at rest, no transitions under reduced motion');
  await g.page.hover(linkSel);
  eq((await look())[0], 'none', tag + ': in colour under the pointer');
  await g.page.mouse.move(1, 1);
  await g.page.evaluate(() => document.body.focus());
  await g.page.keyboard.press('Tab');
  ok(await g.page.evaluate(sel => document.activeElement === document.querySelector(sel), linkSel), tag + ': Tab reaches the first link');
  eq((await look())[0], 'none', tag + ': in colour on keyboard focus');
  /* a touch screen (no hover): the same section in a touch context */
  const r = await render(name, {editing, settings: {logo_style: 'mono'}, blocks: cfg.blocks()});
  const ctx = await browser.newContext({viewport: {width: W, height: 900}, hasTouch: true, isMobile: true});
  const tp = await ctx.newPage();
  await tp.route('**/*', q => /\.(png|jpe?g|svg)(\?|$)/.test(q.request().url()) ? q.fulfill({body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'), contentType: 'image/png'}) : q.fulfill({body: '<!doctype html><html><head><style>' + THEME_VARS + '</style></head><body><div id="shopify-section-test" class="shopify-section">' + r.html + '</div></body></html>', contentType: 'text/html'}));
  await tp.goto('http://theme.test/');
  eq(await tp.evaluate(sel => [matchMedia('(hover: none)').matches, getComputedStyle(document.querySelector(sel)).filter, getComputedStyle(document.querySelector(sel)).opacity], imgSel), [true, 'none', '1'], tag + ': in colour on a touch screen');
  await ctx.close();
  eq(g.errors, [], tag + ': no errors with grey logos');
  await g.page.close();

  /* the data each block shows */
  if (m) {
    const d = await mount(browser, name, {width: W, editing, blocks: [{type: 'heading'}, {type: 'mention', settings: {logo: pic('p1', 'File alt'), publication: 'The Weekly', title: 'One', date: 'May', url: 'https://press.test/1'}}, {type: 'mention', settings: {publication: 'Daily Paper', title: 'Two'}}, {type: 'mention', settings: {title: ''}}, {type: 'mention', settings: {logo: pic('p4', 'File alt')}}], assets: [ASSET]});
    const data = await d.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .pm__item')].map(it => { const i = it.querySelector('img'), a = it.querySelector('.pm__link'), m = it.querySelector('.pm__more'); return {href: a.getAttribute('href'), img: i ? i.getAttribute('src').replace(/\?.*/, '') : null, alt: i ? i.getAttribute('alt') : null, name: it.querySelector('.pm__name') ? it.querySelector('.pm__name').textContent : null, ph: !!it.querySelector('svg.lg__ph'), title: it.querySelector('h3').hidden ? null : it.querySelector('h3').textContent, more: getComputedStyle(m).display !== 'none' && !m.hidden}; }));
    const want = [{href: 'https://press.test/1', img: 'https://theme.test/p1.png', alt: 'The Weekly', name: null, ph: false, title: 'One', more: true},
      {href: null, img: null, alt: null, name: 'Daily Paper', ph: false, title: 'Two', more: false},
      ...(editing ? [{href: null, img: null, alt: null, name: null, ph: true, title: null, more: false}] : []),
      {href: null, img: 'https://theme.test/p4.png', alt: 'File alt', name: null, ph: false, title: null, more: false}];
    eq(data, want, tag + ': logo, name in letters, placeholder (builder only), headline and link come from each block');
    eq(d.errors, [], tag + ': no errors with mention data');
    await d.page.close();
  } else {
    const d = await mount(browser, name, {width: W, editing, blocks: [{type: 'heading'}, {type: 'logo', settings: {logo: pic('l1', 'File alt'), alt: 'Own alt', url: '/pages/a'}}, {type: 'logo', settings: {logo: pic('l2', 'File alt')}}, {type: 'logo'}], assets: [ASSET]});
    const data = await d.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .lw__item')].map(it => { const i = it.querySelector('img'), a = it.querySelector('.lw__tile'); return {href: a.getAttribute('href'), img: i ? i.getAttribute('src').replace(/\?.*/, '') : null, alt: i ? i.getAttribute('alt') : null, ph: !!it.querySelector('svg.lg__ph')}; }));
    eq(data, [{href: '/pages/a', img: 'https://theme.test/l1.png', alt: 'Own alt', ph: false}, {href: null, img: 'https://theme.test/l2.png', alt: 'File alt', ph: false}, ...(editing ? [{href: null, img: null, alt: null, ph: true}] : [])], tag + ': picture, description (or the file\'s own) and link come from each block; an empty logo is a placeholder in the builder only');
    eq(d.errors, [], tag + ': no errors with logo data');
    await d.page.close();
  }
  /* nothing filled in: placeholders in the builder (the Add a section card), nothing on the storefront for an empty wall */
  const e = await render(name, {editing});
  if (editing) ok(/lg__ph/.test(e.html) && !/<img/.test(e.html), tag + ': the first preset draws placeholders, no pictures');
  else if (!m) ok(!/data-r7t=/.test(e.html), tag + ': a wall with no logos draws nothing on the storefront');
  else ok(/data-r7t=/.test(e.html) && !/lg__ph/.test(e.html), tag + ': mentions with words draw on the storefront, with no placeholder');
  const none = await render(name, {editing, blocks: [{type: 'heading'}]});
  eq(new RegExp(m ? 'Add a Mention block' : 'Add a Logo block').test(none.html), editing, tag + ': no item block says so in the builder only');
}

/* ------------------------------------------------------------ the logo wall's rows */
async function wallShapes(browser, W) {
  const name = 'logo-grid-heading', tag = `${name} ${W}`;
  for (const n of [1, 2, 5, 7, 12]) for (const tiles of ['plain', 'lines', 'tiles']) for (const align of ['center', 'left']) {
    const cols = W === 1366 ? 5 : 2;
    const t = await mount(browser, name, {width: W, editing: false, settings: {tile_style: tiles, alignment: align}, blocks: [{type: 'heading'}, ...logos(n)], assets: [ASSET]});
    const q = await probe(t, name), boxes = await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .lw__item')].map(e => { const r = e.getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height}; })), g = q.grid.box;
    eq(rowsOf(boxes), Math.ceil(n / cols), `${tag}: ${n} logos, ${tiles}, ${align}: ${cols} per row`);
    ok(boxes.every(b => near(b.w, boxes[0].w, 0.6) && near(b.h, boxes[0].h, 0.6)), `${tag}: ${n} logos, ${tiles}: every tile the same size`);
    ok(boxes.every(b => b.x >= g.x - 0.5 && b.x + b.w <= g.x + g.w + 0.5), `${tag}: ${n} logos, ${tiles}: inside the wall`);
    const last = boxes.filter(b => near(b.y, boxes[boxes.length - 1].y)), mid = (last[0].x + last[last.length - 1].x + last[last.length - 1].w) / 2;
    ok(align === 'center' ? near(mid, g.x + g.w / 2, 1) : near(last[0].x, g.x, 0.6), `${tag}: ${n} logos, ${tiles}: the last row is ${align === 'center' ? 'centred' : 'from the left'}`);
    if (n >= cols) ok(near(boxes[cols - 1].x + boxes[cols - 1].w, g.x + g.w, 1), `${tag}: ${n} logos, ${tiles}: a full row fills the width`);
    ok(await t.noOverflow(), `${tag}: ${n} logos: no sideways page scroll`);
    eq(t.errors, [], `${tag}: ${n} logos: no errors`);
    await t.page.close();
  }
}

/* ------------------------------------------------------------ Press Mentions cards on a phone: a native scroller */
async function scrollerChecks(browser, W, editing) {
  const name = 'press-mentions', tag = `${name} ${W} ${editing ? 'builder' : 'storefront'}`;
  const t = await mount(browser, name, {width: W, editing, settings: {layout: 'cards', mobile_layout: 'swipe'}, blocks: CFG[name].blocks(), assets: [ASSET]});
  const settle = async () => { let last = -1; for (let i = 0; i < 40; i++) { await t.page.waitForTimeout(70); const x = await t.page.evaluate(() => document.querySelector('[data-r7t-track]').scrollLeft); if (x === last) return x; last = x; } return last; };
  await frames(t, 3);
  const m = await t.page.evaluate(() => { const tr = document.querySelector('[data-r7t-track]'), cs = getComputedStyle(tr), it = tr.querySelector('.pm__item');
    return {x: cs.overflowX, snap: cs.scrollSnapType, over: cs.overscrollBehaviorX, touch: cs.touchAction, bar: cs.scrollbarWidth, align: getComputedStyle(it).scrollSnapAlign, wide: tr.scrollWidth - tr.clientWidth, step: it.getBoundingClientRect().width + parseFloat(cs.columnGap), tab: tr.getAttribute('tabindex'), label: tr.getAttribute('aria-label')}; });
  ok(!/touch-action:\s*none|addEventListener\('(wheel|touchmove|touchstart|pointermove|pointerdown|mousedown)'/.test(fs.readFileSync(path.join(ROOT, 'shopify/assets', ASSET), 'utf8')), tag + ': no drag, wheel or touch handlers');
  if (W === 1366) {
    eq([m.x, m.tab, m.wide <= 1], ['visible', null, true], tag + ': on a wide screen the cards are a grid, not a scroller or a tab stop');
    eq(t.errors, [], tag + ': no errors');
    await t.page.close();
    return;
  }
  eq([m.x, m.snap, m.over, m.touch, m.bar, m.align], ['auto', 'x mandatory', 'contain', 'pan-x pan-y', 'none', 'start'], tag + ': a native snap scroller');
  ok(m.wide > 100 && m.tab === '0' && m.label === 'In the press', tag + ': four cards are wider than the phone; the row is a labelled tab stop');
  eq(await t.page.evaluate(() => document.querySelectorAll('#shopify-section-test button').length), 0, tag + ': no arrows on a phone, the finger moves the row');
  /* touch-style: the scroll position is set directly, and comes to rest on a card */
  await t.page.evaluate(v => { document.querySelector('[data-r7t-track]').scrollLeft = v; }, m.step * 1.4);
  let x = await settle();
  ok(x > 0 && (near(x / m.step, Math.round(x / m.step), 0.03) || near(x, m.wide, 1.5)), `${tag}: a touch-style scroll moves the row and snaps to a card (${x} of step ${m.step})`);
  await t.page.evaluate(() => { document.querySelector('[data-r7t-track]').scrollLeft = 0; }); await settle();
  /* keys on the focused row */
  await t.root('[data-r7t-track]').focus();
  await t.page.keyboard.press('ArrowRight');
  x = await settle();
  ok(near(x, m.step, 2), `${tag}: the right arrow key moves the row one card (${x})`);
  await t.page.keyboard.press('ArrowRight'); await settle();
  await t.page.keyboard.press('ArrowLeft');
  ok(near(await settle(), m.step, 2), tag + ': the left arrow key moves it back');
  for (let i = 0; i < 6; i++) { await t.page.keyboard.press('ArrowRight'); await settle(); }
  ok(near(await settle(), m.wide, 1.5), tag + ': the keys stop at the end');
  eq(await t.page.evaluate(() => ['ArrowDown', 'ArrowUp', ' ', 'PageDown', 'ArrowLeft'].map(key => { const e = new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true}); document.querySelector('[data-r7t-track]').dispatchEvent(e); return e.defaultPrevented; })), [false, false, false, false, true], tag + ': only left and right are taken; up, down, space and page keys stay with the page');
  await t.page.evaluate(() => { document.querySelector('[data-r7t-track]').scrollLeft = 0; }); await settle();
  /* keys with a card focused: focus goes with the row */
  await t.root('.pm__item:nth-child(1) a').focus();
  await t.page.keyboard.press('ArrowRight'); await settle();
  eq(await t.page.evaluate(() => document.activeElement.closest('.pm__item') === document.querySelectorAll('.pm__item')[1]), true, tag + ': focus moves to the next linked card');
  /* a card picked in the builder comes into view */
  await t.page.evaluate(() => { document.querySelector('[data-r7t-track]').scrollLeft = 0; }); await settle();
  await t.page.evaluate(() => document.querySelector('.pm__item:last-child').dispatchEvent(new CustomEvent('shopify:block:select', {bubbles: true})));
  await settle();
  ok(await t.page.evaluate(() => { const r = document.querySelector('.pm__item:last-child').getBoundingClientRect(), b = document.querySelector('[data-r7t-track]').getBoundingClientRect(); return r.left >= b.left - 1 && r.right <= b.right + 1; }), tag + ': a picked card is brought into view');
  /* the page itself never scrolls sideways, and the page scroll is not trapped */
  ok(await t.noOverflow(), tag + ': no sideways page scroll');
  await t.page.evaluate(() => { document.body.style.minHeight = '3000px'; });
  const box = await t.root('[data-r7t-track]').boundingBox();
  await t.page.mouse.move(box.x + 20, box.y + 20);
  await t.page.mouse.wheel(0, 300); await t.page.waitForTimeout(300);
  ok(await t.page.evaluate(() => scrollY) > 100, tag + ': a vertical wheel over the row scrolls the page');
  /* switching to stack live: no longer a scroller, not a tab stop */
  if (editing) {
    await t.emit({mobile_layout: 'stack'}); await frames(t, 3);
    eq(await t.page.evaluate(() => { const tr = document.querySelector('[data-r7t-track]'); return [getComputedStyle(tr).overflowX, tr.hasAttribute('tabindex')]; }), ['visible', false], tag + ': stacked live: not a scroller, not a tab stop');
    await t.emit({mobile_layout: 'swipe'}); await frames(t, 3);
    eq(await t.page.evaluate(() => document.querySelector('[data-r7t-track]').getAttribute('tabindex')), '0', tag + ': swipe again: a tab stop again');
  }
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();
  /* reduced motion: a key moves the row at once */
  const r = await mount(browser, name, {width: W, editing, settings: {layout: 'cards', mobile_layout: 'swipe'}, blocks: CFG[name].blocks(), assets: [ASSET], reducedMotion: 'reduce'});
  await frames(r, 3);
  await r.page.evaluate(() => { window.__b = []; const o = Element.prototype.scrollBy; Element.prototype.scrollBy = function (a) { window.__b.push(a && a.behavior); return o.apply(this, arguments); }; });
  await r.root('[data-r7t-track]').focus();
  await r.page.keyboard.press('ArrowRight');
  eq(await r.page.evaluate(() => window.__b), ['auto'], tag + ': under reduced motion a key moves the row at once');
  eq(r.errors, [], tag + ': no errors under reduced motion');
  await r.page.close();
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
          if (name === 'press-mentions') await scrollerChecks(browser, W, editing);
        }
        await selects(browser, name, W);
        await lifecycle(browser, name, W);
        if (name === 'logo-grid-heading') await wallShapes(browser, W);
      }
    }
  } finally { await browser.close(); }
  console.log(`trust round 7: ${checks} checks passed (${names.join(', ')}; 375 and 1366, builder and storefront)`);
})().catch(e => { console.error(e); console.log(`trust round 7: failed after ${checks} checks`); process.exitCode = 1; });
