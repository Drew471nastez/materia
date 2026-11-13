/* Blog and Slideshows, round 7: Blog Spotlight (blog-featured-list) and
   Card Slideshow (slideshow-cards).

   For both, at 375 and 1366, in the builder and on the storefront: the file
   and the schema, theme inheritance (with the theme's priority rules on and
   off), every section and block control (live, back again, and after a
   server redraw, with the live result equal to the redrawn one), controls
   that belong to one width, every select option looking different, custom
   colours and fonts winning under the real theme rules and restoring the
   theme when off, two instances staying apart, an added block, redraws that
   set the section up once, pictures and the scroll position kept on
   unrelated edits, first paint equal to the hydrated paint, reduced motion,
   tap targets, one h2, no overflow at 375 and no errors.
   Blog Spotlight: the posts come from the blog (newest featured, or the post
   picked; the next ones listed; the post being read left out; an empty blog
   a hint in the builder and nothing on the storefront).
   Card Slideshow: native scroller styles, touch-style scrollLeft, snapping,
   arrows, keys, dots, ends; autoplay moves and waits on hover, focus, touch,
   off screen, a hidden tab and reduced motion.

   LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-r7-stories.cjs [section ...] */
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const ROOT = path.join(__dirname, '..');
const FP = require('./theme-featured-product-round5.cjs');
if (!FP.Liquid) { console.log('stories round 7 skipped: liquidjs not installed (LIQUIDJS=<path to liquidjs>)'); return; }
/* The fixture's t filter prints the key's last word; read the theme's own locale instead. */
const LOCALE = JSON.parse(fs.readFileSync(path.join(ROOT, 'shopify/locales/en.default.json'), 'utf8').replace(/^\s*\/\*[\s\S]*?\*\//, '').replace(/,(\s*[}\]])/g, '$1'));
const baseEngine = FP.engine;
FP.engine = (...a) => {
  const e = baseEngine(...a);
  e.registerFilter('t', k => { const v = String(k).split('.').reduce((o, p) => o && o[p], LOCALE); return typeof v === 'string' ? v : String(k).split('.').pop().replace(/_/g, ' '); });
  e.registerFilter('truncatewords', (v, n = 15, end = '...') => { const w = String(v || '').split(/\s+/).filter(Boolean); return w.length > n ? w.slice(0, n).join(' ') + end : w.join(' '); });
  return e;
};
const {launch, mount, render, schemaOf, schemaProblems} = require('./media-fixture.cjs');
const ASSET = 'live-r7-stories.js';
const only = process.argv.slice(2);

const pic = (n, w = 1200, h = 900) => ({url: 'https://theme.test/' + n + '.png', src: 'https://theme.test/' + n + '.png', width: w, height: h, alt: 'Alt ' + n});
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'};
const FONT2 = {family: 'Courier New', fallback_families: 'monospace'};
const TITLES = ['How we pick our linen', 'Washing wool without shrinking it', 'A week in the workshop', 'Five ways to wear the wrap dress', 'Repairs we do for free', 'Notes on natural dye', 'Packing for a long weekend', 'Why our seams are flat'];
const post = (i, o = {}) => ({id: 100 + i, title: TITLES[i], handle: 'news/p' + i, url: '/blogs/news/p' + i, author: 'Writer', published_at: '2026-0' + (i + 1) + '-02', excerpt: i === 0 ? '' : '<p>Excerpt of post ' + i + '.</p>', content: '<p>Body of post ' + i + ', the opening lines.</p>', image: pic('post' + i), ...o});
const POSTS = TITLES.map((_, i) => post(i));
const BLOG = {id: 7, title: 'News', handle: 'news', url: '/blogs/news', articles: POSTS, articles_count: POSTS.length};
const BLOG2 = {id: 8, title: 'Journal', handle: 'journal', url: '/blogs/journal', articles: [post(5, {id: 205, title: 'Journal entry one', url: '/blogs/journal/one'}), post(6, {id: 206, title: 'Journal entry two', url: '/blogs/journal/two'}), post(7, {id: 207, title: 'Journal entry three', url: '/blogs/journal/three'})]};
const EMPTY_BLOG = {id: 9, title: 'Empty', handle: 'empty', url: '/blogs/empty', articles: [], articles_count: 0};
const G = {blogs: {news: BLOG, journal: BLOG2, empty: EMPTY_BLOG}};
const cardsOf = n => Array.from({length: n}, (_, i) => ({type: 'card', settings: {image: pic('card' + i, 1000, 1250), heading: 'Card ' + (i + 1), text: 'Line for card ' + (i + 1) + '.'}}));

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const near = (a, b, d = 1) => Math.abs(a - b) <= d;
const rgb = {bg: 'rgb(24, 32, 40)', heading: 'rgb(255, 255, 255)', text: 'rgb(204, 204, 204)', border: 'rgb(68, 85, 102)', altBg: 'rgb(250, 250, 250)', altHeading: 'rgb(16, 16, 16)', altText: 'rgb(51, 51, 51)', btn: 'rgb(18, 52, 86)', hover: 'rgb(255, 0, 0)'};

/* ------------------------------------------------------------ probes (run in the page) */
const PROBES = {
  'blog-featured-list': uid => {
    const w = document.getElementById('shopify-section-' + uid), root = w.querySelector('.bfl');
    if (!root) return {present: false};
    const cs = (el, k) => el ? getComputedStyle(el)[k] : null, r1 = n => Math.round(n * 2) / 2, top = root.getBoundingClientRect().top;
    const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return {x: r1(r.x), y: r1(r.y - top), w: r1(r.width), h: r1(r.height)}; };
    const shown = el => !!el && !el.hidden && cs(el, 'display') !== 'none';
    const q = s => root.querySelector(s);
    const head = q('[data-r7s-header]'), h = q('.bfl__heading'), lede = q('.bfl__lede'), ledeP = lede && (lede.querySelector('p') || lede), all = q('[data-r7s-all]');
    const feat = q('.bfl__feature'), media = q('.bfl__media'), title = q('.bfl__title'), meta = q('.bfl__meta'), ex = q('.bfl__excerpt'), read = q('[data-r7s-read]');
    const list = q('.bfl__list'), rows = [...root.querySelectorAll('.bfl__row')], row = rows[0], rowTitle = row && row.querySelector('.bfl__row-title'), date = row && row.querySelector('.bfl__date'), thumb = row && row.querySelector('.bfl__thumb'), img = media && media.querySelector('img');
    return {present: true, display: cs(root, 'display'), scheme: [...root.classList].filter(c => c.startsWith('color-')).join(' '), spacing: root.classList.contains('remove_spacing'), width: root.dataset.width,
      bg: cs(root, 'backgroundColor'), pt: cs(root, 'paddingTop'), pb: cs(root, 'paddingBottom'), mt: cs(w, 'marginTop'), mb: cs(w, 'marginBottom'), ownFont: root.hasAttribute('data-own-font'),
      inner: box(q('.bfl__inner')), header: {shown: shown(head)},
      heading: h && {html: h.innerHTML, shown: shown(h), color: cs(h, 'color'), family: cs(h, 'fontFamily'), size: cs(h, 'fontSize'), weight: cs(h, 'fontWeight')},
      lede: lede && {html: lede.innerHTML, shown: shown(lede), color: cs(ledeP, 'color'), family: cs(ledeP, 'fontFamily')},
      all: all && {text: all.textContent, href: all.getAttribute('href'), shown: shown(all), bg: cs(all, 'backgroundColor'), radius: cs(all, 'borderTopLeftRadius'), h: all.getBoundingClientRect().height},
      feature: box(feat), list: list && {box: box(list), n: rows.length, border: cs(list, 'borderTopColor'), titles: rows.map(r => r.querySelector('.bfl__row-title').textContent), hrefs: rows.map(r => r.getAttribute('href'))},
      media: media && {box: box(media), href: media.getAttribute('href'), img: img ? img.getAttribute('src').replace(/\?.*$/, '') : null, ph: !!media.querySelector('.bfl__ph')},
      title: title && {text: title.textContent, href: title.querySelector('a') && title.querySelector('a').getAttribute('href'), color: cs(title, 'color'), family: cs(title, 'fontFamily'), size: cs(title, 'fontSize'), weight: cs(title, 'fontWeight')},
      meta: meta && {text: meta.textContent, shown: shown(meta), color: cs(meta, 'color')},
      excerpt: ex && {text: ex.textContent, shown: shown(ex), color: cs(ex, 'color'), family: cs(ex, 'fontFamily')},
      read: read && {text: read.textContent, shown: shown(read), color: cs(read, 'color'), href: read.getAttribute('href')},
      row: row && {box: box(row), color: cs(rowTitle, 'color'), family: cs(rowTitle, 'fontFamily'), size: cs(rowTitle, 'fontSize'), date: shown(date), thumb: shown(thumb), thumbBox: box(thumb)}};
  },
  'slideshow-cards': uid => {
    const w = document.getElementById('shopify-section-' + uid), root = w.querySelector('.sc');
    if (!root) return {present: false};
    const cs = (el, k) => el ? getComputedStyle(el)[k] : null, r1 = n => Math.round(n * 2) / 2, top = root.getBoundingClientRect().top;
    const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return {x: r1(r.x), y: r1(r.y - top), w: r1(r.width), h: r1(r.height)}; };
    const shown = el => !!el && !el.hidden && cs(el, 'display') !== 'none';
    const q = s => root.querySelector(s);
    const head = q('.sc__header'), h = q('.sc__heading'), track = q('[data-r7s-track]'), cards = [...root.querySelectorAll('.sc__card')], c = cards[0];
    const media = c && c.querySelector('.sc__media'), shade = c && c.querySelector('.sc__shade'), title = c && c.querySelector('.sc__title'), text = c && c.querySelector('.sc__text'), btn = c && c.querySelector('.sc__btn'), img = media && media.querySelector('img');
    const nav = q('.sc__nav'), prev = q('[data-r7s-prev]'), next = q('[data-r7s-next]'), dots = q('[data-r7s-dots]');
    return {present: true, display: cs(root, 'display'), scheme: [...root.classList].filter(x => x.startsWith('color-')).join(' '), spacing: root.classList.contains('remove_spacing'), width: root.dataset.width,
      bg: cs(root, 'backgroundColor'), pt: cs(root, 'paddingTop'), pb: cs(root, 'paddingBottom'), mt: cs(w, 'marginTop'), mb: cs(w, 'marginBottom'), ownFont: root.hasAttribute('data-own-font'),
      autoplay: root.dataset.autoplay, speed: root.dataset.speed,
      inner: box(q('.sc__inner')), header: shown(head),
      heading: h && {html: h.innerHTML, shown: shown(h), color: cs(h, 'color'), family: cs(h, 'fontFamily'), size: cs(h, 'fontSize'), weight: cs(h, 'fontWeight')},
      track: track && {box: box(track), gap: cs(track, 'columnGap'), n: cards.length, label: track.getAttribute('aria-label')},
      card: c && {box: box(c), bg: cs(c, 'backgroundColor')}, second: cards[1] ? box(cards[1]) : null,
      media: media && {box: box(media), img: img ? img.getAttribute('src').replace(/\?.*$/, '') : null, ph: !!media.querySelector('[data-r7s-ph]')},
      shade: shade && {display: cs(shade, 'display'), opacity: cs(shade, 'opacity'), bg: cs(shade, 'backgroundColor')},
      title: title && {html: title.innerHTML, shown: shown(title), color: cs(title, 'color'), family: cs(title, 'fontFamily'), size: cs(title, 'fontSize'), weight: cs(title, 'fontWeight'), box: box(title)},
      text: text && {html: text.innerHTML, shown: shown(text), color: cs(text, 'color'), family: cs(text, 'fontFamily')},
      btn: btn && {text: btn.textContent, tag: btn.tagName, href: btn.getAttribute('href'), shown: shown(btn), bg: cs(btn, 'backgroundColor'), radius: cs(btn, 'borderTopLeftRadius'), h: btn.getBoundingClientRect().height},
      arrows: {nav: shown(nav) && cs(nav, 'visibility') === 'visible', prevOff: prev ? prev.disabled : null, nextOff: next ? next.disabled : null, flag: root.dataset.arrows},
      dots: {shown: shown(dots), n: dots ? [...dots.children].filter(d => !d.hidden).length : 0, current: dots ? [...dots.children].findIndex(d => d.getAttribute('aria-current') === 'true') : -1}};
  },
};
const probe = (t, name, uid = 'test') => t.page.evaluate(PROBES[name], uid);
/* Two frames for the controller's one paint per frame, then any transition is run to its end. */
const frames = (t, n = 2) => t.page.evaluate(n => new Promise(r => { const f = () => n-- > 0 ? requestAnimationFrame(f) : (document.getAnimations().forEach(a => { try { a.finish(); } catch (_) {} }), requestAnimationFrame(() => r())); f(); }), n);

/* ------------------------------------------------------------ what every control must do */
const CUSTOM = {enable_custom_style: true};
const px = v => parseFloat(v);
const common = W => ({
  color_scheme: {v: 'alt-scheme', ok: q => q.scheme === 'color-alt-scheme' && q.bg === rgb.altBg && q.heading.color === rgb.altHeading},
  reset_spacing: {v: false, pre: {section_margin_top_desktop: 40, section_margin_top_mobile: 20, section_margin_bottom_desktop: 36, section_margin_bottom_mobile: 16}, ok: q => q.mt === (W === 375 ? '20px' : '40px') && q.mb === (W === 375 ? '16px' : '36px') && q.spacing === false},
  padding_top: {v: 100, at: 1366, ok: q => q.pt === '100px'},
  padding_bottom: {v: 90, at: 1366, ok: q => q.pb === '90px'},
  section_margin_top_desktop: {v: 40, at: 1366, pre: {reset_spacing: false}, ok: q => q.mt === '40px'},
  section_margin_bottom_desktop: {v: 44, at: 1366, pre: {reset_spacing: false}, ok: q => q.mb === '44px'},
  padding_top_mobile: {v: 10, at: 375, ok: q => q.pt === '10px'},
  padding_bottom_mobile: {v: 90, at: 375, ok: q => q.pb === '90px'},
  section_margin_top_mobile: {v: 24, at: 375, pre: {reset_spacing: false}, ok: q => q.mt === '24px'},
  section_margin_bottom_mobile: {v: 28, at: 375, pre: {reset_spacing: false}, ok: q => q.mb === '28px'},
  enable_custom_fonts: {v: true, pre: {heading_font: FONT, body_font: FONT2}, ok: q => /Verdana/.test(q.heading.family) && /Verdana/.test(q.title.family) && q.ownFont && /Courier/.test((q.excerpt || q.text).family)},
  heading_font: {v: FONT, pre: {enable_custom_fonts: true}, ok: q => /Verdana/.test(q.heading.family) && /Verdana/.test(q.title.family) && !/Verdana/.test((q.excerpt || q.text).family)},
  body_font: {v: FONT2, pre: {enable_custom_fonts: true}, ok: q => /Courier/.test((q.excerpt || q.text).family) && !/Courier/.test(q.title.family)},
});
const CFG = {
  'blog-featured-list': {
    p: 'bfl', settings: () => ({blog: BLOG}), blocks: () => [{type: 'heading', settings: {heading: 'From the <em>blog</em>'}}, {type: 'text'}],
    section: W => ({...common(W),
      section_width: {v: 'container', ok: (q, b) => q.width === 'container' && (W === 1366 ? q.inner.w < b.inner.w - 20 : true)},
      blog: {v: BLOG2, back: BLOG, redraw: true, ok: q => q.title.text === 'Journal entry one' && q.list.titles.join('|') === 'Journal entry two|Journal entry three' && q.all.href === '/blogs/journal'},
      featured_article: {v: POSTS[3], back: '', redraw: true, ok: q => q.title.text === TITLES[3] && q.title.href === '/blogs/news/p3' && q.media.img === 'https://theme.test/post3.png' && q.list.titles.join('|') === [TITLES[0], TITLES[1], TITLES[2]].join('|')},
      posts_count: {v: 5, redraw: true, ok: q => q.list.n === 5 && q.list.titles[4] === TITLES[5]},
      show_date: {v: false, ok: q => !q.meta.shown && !q.row.date},
      show_excerpt: {v: false, ok: q => !q.excerpt.shown},
      button_label: {v: 'Keep reading', ok: q => q.read.text === 'Keep reading' && q.read.shown},
      show_view_all: {v: false, ok: q => !q.all || !q.all.shown},
      view_all_label: {v: 'All our posts', ok: q => q.all.text === 'All our posts'},
      view_all_link: {v: '/pages/journal', ok: q => q.all.href === '/pages/journal'},
      featured_position: {v: 'right', at: 1366, ok: q => q.feature.x > q.list.box.x + 100},
      image_ratio: {v: 'portrait', ok: (q, b) => q.media.box.h > q.media.box.w && b.media.box.h < b.media.box.w},
      show_list_images: {v: false, ok: q => !q.row.thumb},
      enable_custom_style: {v: true, pre: {heading_color: '#abcdef'}, ok: q => q.heading.color === 'rgb(171, 205, 239)'},
      heading_color: {v: '#ff8800', pre: CUSTOM, ok: q => q.heading.color === 'rgb(255, 136, 0)'},
      text_color: {v: '#00ff88', pre: CUSTOM, ok: q => q.lede.color === 'rgb(0, 255, 136)' && q.excerpt.color === 'rgb(0, 255, 136)'},
      title_color: {v: '#ff0088', pre: CUSTOM, ok: q => q.title.color === 'rgb(255, 0, 136)' && q.row.color === 'rgb(255, 0, 136)' && q.read.color === 'rgb(255, 0, 136)'},
      meta_color: {v: '#8800ff', pre: CUSTOM, ok: q => q.meta.color === 'rgb(136, 0, 255)'},
      border_color: {v: '#112233', pre: CUSTOM, ok: q => q.list.border === 'rgb(17, 34, 51)'},
      title_size: {v: 'large', ok: (q, b) => px(q.title.size) > px(b.title.size) + 2},
    }),
    block: {
      heading: {
        heading: {v: 'Notes from <em>the studio</em>', ok: q => q.heading.html === 'Notes from <em>the studio</em>' && q.heading.shown},
        enable_custom_style: {v: true, pre: {color: '#ff0000'}, ok: q => q.heading.color === 'rgb(255, 0, 0)'},
        color: {v: '#00ff00', pre: CUSTOM, ok: q => q.heading.color === 'rgb(0, 255, 0)'},
      },
      text: {
        text: {v: '<p>New words for the line.</p>', ok: q => q.lede.html === '<p>New words for the line.</p>' && q.lede.shown},
        enable_custom_style: {v: true, pre: {color: '#ff0000'}, ok: q => q.lede.color === 'rgb(255, 0, 0)'},
        color: {v: '#00ff00', pre: CUSTOM, ok: q => q.lede.color === 'rgb(0, 255, 0)'},
      },
    },
    selects: {section_width: 1366, featured_position: 1366, image_ratio: 0, title_size: 0},
  },
  'slideshow-cards': {
    p: 'sc', settings: () => ({}), blocks: () => [{type: 'heading', settings: {heading: 'Take a <em>closer</em> look'}}, ...cardsOf(6)],
    section: W => ({...common(W),
      section_width: {v: 'container', ok: (q, b) => q.width === 'container' && (W === 1366 ? q.inner.w < b.inner.w - 20 : true)},
      card_style: {v: 'below', ok: q => q.shade.display === 'none' && q.title.box.y >= q.media.box.y + q.media.box.h - 0.5 && q.title.color === rgb.heading},
      card_width: {v: 60, at: 1366, ok: (q, b) => q.card.box.w > b.card.box.w + 100},
      gap: {v: 40, at: 1366, ok: q => q.track.gap === '40px'},
      show_arrows: {v: false, at: 1366, ok: (q, b) => b.arrows.nav && !q.arrows.nav && q.arrows.flag === 'false'},
      show_dots: {v: false, ok: (q, b) => b.dots.shown && !q.dots.shown},
      image_ratio: {v: 'landscape', ok: q => q.card.box.h < q.card.box.w},
      overlay_opacity: {v: 60, ok: q => q.shade.opacity === '0.6'},
      enable_custom_style: {v: true, pre: {text_color: '#ff0000'}, ok: q => q.title.color === 'rgb(255, 0, 0)'},
      text_color: {v: '#ffee00', pre: CUSTOM, ok: q => q.title.color === 'rgb(255, 238, 0)' && q.text.color === 'rgb(255, 238, 0)'},
      overlay_color: {v: '#0000ff', pre: CUSTOM, ok: q => q.shade.bg === 'rgb(0, 0, 255)'},
      card_bg: {v: '#112233', pre: {...CUSTOM, card_style: 'below'}, ok: q => q.card.bg === 'rgb(17, 34, 51)'},
      heading_size: {v: 'large', ok: (q, b) => px(q.title.size) > px(b.title.size) + 2},
      autoplay: {v: true, ok: q => q.autoplay === 'true'},
      autorotate_speed: {v: 3, pre: {autoplay: true}, ok: q => q.speed === '3'},
      card_width_mobile: {v: 70, at: 375, ok: (q, b) => q.card.box.w < b.card.box.w - 30},
      gap_mobile: {v: 24, at: 375, ok: q => q.track.gap === '24px'},
    }),
    block: {
      heading: {
        heading: {v: 'Shop <em>by story</em>', ok: q => q.heading.html === 'Shop <em>by story</em>' && q.heading.shown && q.track.label === 'Shop by story'},
        enable_custom_style: {v: true, pre: {color: '#ff0000'}, ok: q => q.heading.color === 'rgb(255, 0, 0)'},
        color: {v: '#00ff00', pre: CUSTOM, ok: q => q.heading.color === 'rgb(0, 255, 0)'},
      },
      card: {
        image: {v: pic('own-picture'), ok: q => q.media.img === 'https://theme.test/own-picture.png' && !q.media.ph},
        heading: {v: 'A <em>new</em> title', ok: q => q.title.html === 'A <em>new</em> title' && q.title.shown},
        text: {v: 'A <strong>new</strong> line', ok: q => q.text.html === 'A <strong>new</strong> line' && q.text.shown},
        button_label: {v: 'See the range', ok: q => q.btn.text === 'See the range' && q.btn.shown},
        button_link: {v: '/collections/sale', ok: q => q.btn.tag === 'A' && q.btn.href === '/collections/sale'},
      },
    },
    selects: {section_width: 1366, card_style: 0, image_ratio: 0, heading_size: 0},
  },
};
const visible = list => (list || []).filter(x => x.id && x.hidden !== true && x.visible_if !== '{{ false }}');

/* ------------------------------------------------------------ static */
function statics(name) {
  const {raw, schema: s} = schemaOf(name), lines = raw.split('\n');
  eq(lines[0], '<template compat="shopify">', name + ': line 1');
  eq(lines[1], `<script src="{{ '${ASSET}' | asset_url }}" defer="defer"></script>`, name + ': line 2 links the controller');
  eq(lines[2], "{% render 'theme-type' %}", name + ': theme-type right after');
  eq(lines.filter(l => /^\s*<\/template>\s*$/.test(l)).length, 1, name + ': one closing template line');
  eq(Object.keys(JSON.parse(raw.split('<schema>')[1].split('</schema>')[0])), ['shopify'], name + ': the schema holds only the theme\'s own object');
  eq(schemaProblems(name), [], name + ': schema problems');
  ok(s.name.length <= 25, name + ': name fits the builder');
  const others = fs.readdirSync(path.join(ROOT, 'sections')).filter(f => f.endsWith('.storelib') && f !== name + '.storelib').filter(f => { try { return schemaOf(f.slice(0, -9)).schema.name === s.name; } catch (_) { return false; } });
  eq(others, [], name + ': no other section has this name');
  const cat = name === 'blog-featured-list' ? 'Blog' : 'Slideshows';
  eq([s.presets[0].name, s.presets[0].category], [s.name, cat], name + ': preset name and category');
  const order = s.settings.filter(x => x.type === 'header').map(x => x.content);
  const want = ['General', 'Content', 'Layout', 'Images', 'Appearance', 'Typography', 'Animation', 'Desktop spacing', 'Mobile'].filter(x => order.includes(x));
  eq(order, want, name + ': groups in the shared order');
  eq(s.settings.filter(x => x.id).slice(0, 3).map(x => x.id), ['color_scheme', 'section_width', 'reset_spacing'], name + ': General group');
  /* spacing controls are the category's own (Slideshow), the mobile padding the same range */
  const ref = schemaOf('slideshow').schema.settings, mine = s.settings;
  for (const id of ['padding_top', 'padding_bottom', 'section_margin_top_desktop', 'section_margin_bottom_desktop', 'section_margin_top_mobile', 'section_margin_bottom_mobile', 'reset_spacing'])
    eq(mine.find(x => x.id === id), ref.find(x => x.id === id), name + ': ' + id + ' matches the category');
  for (const id of ['padding_top_mobile', 'padding_bottom_mobile']) { const x = mine.find(y => y.id === id), d = ref.find(y => y.id === id.replace('_mobile', '')); eq([x.min, x.max, x.step, x.default], [d.min, d.max, d.step, d.default], name + ': ' + id + ' has the desktop range'); }
  if (name === 'slideshow-cards') for (const id of ['autoplay', 'autorotate_speed']) eq(mine.find(x => x.id === id), ref.find(x => x.id === id), name + ': ' + id + ' matches Slideshow');
  if (name === 'blog-featured-list') {
    const bp = schemaOf('blog-posts').schema.settings;
    for (const id of ['blog', 'show_date', 'view_all_label', 'view_all_link']) eq(mine.find(x => x.id === id).type, bp.find(x => x.id === id).type, name + ': ' + id + ' is the same control as in Featured Blog Posts');
    eq(mine.filter(x => ['blog', 'article'].includes(x.type)).map(x => x.type), ['blog', 'article'], name + ': posts come from a blog picker and an article picker only');
  }
  if (name === 'slideshow-cards') eq(s.blocks.find(b => b.type === 'card').settings.filter(x => x.id === 'image').map(x => x.type), ['image_picker'], name + ': the card picture is an image picker');
  const words = JSON.stringify(s) + raw.split('<schema>')[0].replace(/\{%-?\s*comment[\s\S]*?endcomment\s*-?%\}/g, '');
  ok(!/—|–/.test(words), name + ': no dashes in copy');
  ok(!/\b(unlock|elevate|seamless|powerful|effortlessly|supercharge|transform)\b/i.test(JSON.stringify(s)), name + ': no banned words');
  ok(!/<link\b|<iframe\b|onclick=|fetch\(|swiper/i.test(raw), name + ': no link, iframe, inline handler, fetch or Swiper');
  /* every colour of the default drawing is a theme variable (white words on a dark shade over a picture excepted) */
  const css = raw.split('<schema>')[0].match(/<style>[\s\S]*?<\/style>/g).join('\n');
  eq([...new Set((css.match(/#[0-9a-fA-F]{3,8}\b/g) || []))].sort(), name === 'slideshow-cards' ? ['#000000', '#ffffff'] : [], name + ': no hard-coded colours');
  /* every schema id is covered by this test */
  const cfg = CFG[name], sec = cfg.section(1366);
  eq(visible(s.settings).map(x => x.id).filter(id => !sec[id]), [], name + ': every section setting has a check');
  for (const b of s.blocks) eq(visible(b.settings).map(x => x.id).filter(id => !(cfg.block[b.type] || {})[id]), [], name + ': every ' + b.type + ' setting has a check');
}

/* ------------------------------------------------------------ every control, live and redrawn */
async function controls(browser, name, W, editing) {
  const cfg = CFG[name], s = schemaOf(name).schema, tag = `${name} ${W} ${editing ? 'builder' : 'storefront'}`;
  const t = await mount(browser, name, {width: W, editing, settings: cfg.settings(), blocks: cfg.blocks(), assets: [ASSET], globals: G});
  const start = JSON.parse(JSON.stringify(t.section));
  const base = await probe(t, name);
  ok(base.present, tag + ': draws');
  eq(await t.page.evaluate(() => !!document.querySelector('[data-r7s-settings]')), editing, tag + ': settings JSON only in the builder');
  const run = async (id, spec, block) => {
    const where = block ? block + '.' + id : id, bid = block ? t.blockId(block) : undefined;
    const was = block ? start.blocks.find(b => b.id === bid).settings : start.settings;
    const change = {...(spec.pre || {}), [id]: spec.v}, back = Object.fromEntries(Object.keys(change).map(k => [k, k === id && 'back' in spec ? spec.back : was[k] === undefined ? '' : was[k]]));
    const want = !spec.at || spec.at === W;
    let live = null;
    if (editing && !spec.redraw) {
      await t.emit(change, bid); await frames(t);
      live = await probe(t, name);
      eq(!!spec.ok(live, base), want, `${tag}: ${where} live ${want ? 'changes its element' : 'leaves this width alone'}`);
      await t.emit(back, bid); await frames(t);
      eq(await probe(t, name), base, `${tag}: ${where} back to the start, live`);
    }
    const blocksWith = set => t.section.blocks.map(b => ({type: b.type, settings: b.id === bid ? {...start.blocks.find(x => x.id === b.id).settings, ...set} : start.blocks.find(x => x.id === b.id).settings}));
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
  const cfg = CFG[name], tag = `${name} ${W} ${editing ? 'builder' : 'storefront'}`, blog = name === 'blog-featured-list';
  for (const priority of [true, 'off']) {
    const t = await mount(browser, name, {width: W, editing, settings: cfg.settings(), blocks: cfg.blocks(), assets: [ASSET], priority, globals: G});
    const q = await probe(t, name);
    eq([q.bg, q.heading.color, q.heading.weight], [rgb.bg, rgb.heading, '700'], `${tag} priority ${priority}: scheme background, heading colour and weight`);
    ok(/Georgia/.test(q.heading.family) && /Georgia/.test(q.title.family), `${tag} priority ${priority}: theme heading font on the heading and the titles`);
    if (blog) {
      eq([q.title.color, q.row.color, q.excerpt.color, q.lede.color, q.list.border], [rgb.heading, rgb.heading, rgb.text, rgb.text, rgb.border], `${tag} priority ${priority}: titles, text and lines follow the scheme`);
      ok(/Arial/.test(q.excerpt.family) && /Arial/.test(q.lede.family), `${tag} priority ${priority}: theme body font`);
      eq([q.all.bg, q.all.radius], ['rgb(255, 255, 255)', '12px'], `${tag} priority ${priority}: View all is the theme's secondary button`);
    } else {
      eq([q.title.color, q.text.color, q.btn.bg, q.btn.radius], [rgb.heading, rgb.heading, rgb.btn, '12px'], `${tag} priority ${priority}: white words on the shade, the theme's button`);
      ok(/Arial/.test(q.text.family), `${tag} priority ${priority}: theme body font`);
      if (W === 1366) { await t.root('.sc__btn').first().hover(); await frames(t); eq(await t.css('.sc__btn', 'backgroundColor'), rgb.hover, `${tag} priority ${priority}: the button takes the theme hover`); await t.page.mouse.move(0, 0); }
    }
    eq(t.errors, [], `${tag} priority ${priority}: no errors`);
    await t.page.close();
  }
  /* scheme switch, live and redrawn */
  const t = await mount(browser, name, {width: W, editing, settings: cfg.settings(), blocks: cfg.blocks(), assets: [ASSET], globals: G});
  await t.emit({color_scheme: 'alt-scheme'}); await frames(t);
  let q = await probe(t, name);
  eq([q.bg, q.heading.color], [rgb.altBg, rgb.altHeading], tag + ': alternate scheme, live');
  if (blog) eq([q.title.color, q.excerpt.color, q.list.border], [rgb.altHeading, rgb.altText, 'rgb(221, 221, 221)'], tag + ': titles, text and lines follow the scheme');
  else eq([q.title.color, q.text.color], ['rgb(255, 255, 255)', 'rgb(255, 255, 255)'], tag + ': words on a picture stay white');
  await t.redraw({settings: {color_scheme: 'alt-scheme'}}); await frames(t);
  eq(await probe(t, name), q, tag + ': alternate scheme, redrawn');
  if (!blog) {
    await t.redraw({settings: {color_scheme: 'alt-scheme', card_style: 'below'}}); await frames(t);
    q = await probe(t, name);
    eq([q.title.color, q.text.color], [rgb.altHeading, rgb.altText], tag + ': text below the picture follows the scheme');
  }
  await t.redraw({settings: {color_scheme: 'default-color-scheme', card_style: 'overlay'}}); await frames(t);
  /* custom fonts on the element and a descendant, under the real theme rules, then off */
  const fonts = {enable_custom_fonts: true, heading_font: FONT, body_font: FONT2};
  const families = () => t.page.evaluate(p => { const r = document.querySelector('#shopify-section-test .' + p), f = el => el ? getComputedStyle(el).fontFamily : ''; return {em: f(r.querySelector('.' + p + '__heading em')), h: f(r.querySelector('.' + p + '__heading')), title: f(r.querySelector('.' + p + '__title')), body: f(r.querySelector(p === 'bfl' ? '.bfl__lede p' : '.sc__text')), row: f(r.querySelector('.bfl__row-title'))}; }, cfg.p);
  for (const how of ['live', 'redrawn']) {
    if (how === 'live') await t.emit(fonts); else await t.redraw({settings: fonts});
    await frames(t);
    const f = await families();
    ok(/Verdana/.test(f.h) && /Verdana/.test(f.em) && /Verdana/.test(f.title) && (!blog || /Verdana/.test(f.row)), `${tag}: custom heading font wins on the heading, its <em> and the titles, ${how}`);
    ok(/Courier/.test(f.body), `${tag}: custom text font wins on the text, ${how}`);
    const off = {enable_custom_fonts: false};
    if (how === 'live') await t.emit(off); else await t.redraw({settings: off});
    await frames(t);
    const g = await families();
    ok(/Georgia/.test(g.h) && /Georgia/.test(g.em) && /Georgia/.test(g.title) && /Arial/.test(g.body), `${tag}: fonts off restores the theme, ${how}`);
  }
  await t.redraw({settings: {enable_custom_fonts: false, heading_font: 'assistant_n4', body_font: 'assistant_n4'}}); await frames(t);
  /* custom styling on with every colour, then off: exactly the theme again */
  const colours = blog ? {enable_custom_style: true, heading_color: '#ff8800', text_color: '#00ff88', title_color: '#ff0088', meta_color: '#8800ff', border_color: '#112233'} : {enable_custom_style: true, text_color: '#ffee00', overlay_color: '#0000ff'};
  const empty = blog ? {heading_color: '', text_color: 'rgba(0, 0, 0, 0)', title_color: '', meta_color: '', border_color: ''} : {text_color: '', overlay_color: 'rgba(0, 0, 0, 0)'};
  const look = q => blog ? [q.heading.color, q.lede.color, q.title.color, q.meta.color, q.list.border] : [q.title.color, q.text.color, q.shade.bg];
  const base = await probe(t, name);
  for (const how of ['live', 'redrawn']) {
    if (how === 'live') await t.emit(colours); else await t.redraw({settings: colours});
    await frames(t);
    eq(look(await probe(t, name)), blog ? ['rgb(255, 136, 0)', 'rgb(0, 255, 136)', 'rgb(255, 0, 136)', 'rgb(136, 0, 255)', 'rgb(17, 34, 51)'] : ['rgb(255, 238, 0)', 'rgb(255, 238, 0)', 'rgb(0, 0, 255)'], `${tag}: every custom colour lands, ${how}`);
    if (how === 'live') await t.emit(empty); else await t.redraw({settings: {...colours, ...empty}});
    await frames(t);
    eq(look(await probe(t, name)), look(base), `${tag}: an empty custom colour falls back to the scheme, ${how}`);
    const off = {...colours, enable_custom_style: false};
    if (how === 'live') await t.emit(off); else await t.redraw({settings: off});
    await frames(t);
    eq(await probe(t, name), base, `${tag}: custom styling off restores the theme, ${how}`);
  }
  /* a blank heading hides; with nothing else in it, the header goes */
  if (blog) {
    await t.redraw({settings: {show_view_all: false, enable_custom_style: false}}); await frames(t);
    await t.emit({heading: ''}, t.blockId('heading')); await frames(t);
    q = await probe(t, name);
    ok(!q.heading.shown && q.header.shown, tag + ': an empty heading is hidden, the text keeps the header');
    await t.emit({text: ''}, t.blockId('text')); await frames(t);
    eq((await probe(t, name)).header.shown, false, tag + ': the header goes when it is empty');
    await t.emit({show_view_all: true}); await frames(t);
    eq((await probe(t, name)).header.shown, true, tag + ': View all brings it back');
  } else {
    await t.emit({heading: ''}, t.blockId('heading')); await frames(t);
    q = await probe(t, name);
    eq([q.heading.shown, q.header, q.track.label], [false, W === 1366, 'Cards'], tag + ': an empty heading is hidden; the arrows keep the header on desktop; the row keeps a name');
    await t.emit({button_label: ''}, t.blockId('card')); await frames(t);
    eq((await probe(t, name)).btn.shown, false, tag + ': an empty button label hides the button');
  }
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();
}

/* ------------------------------------------------------------ select options look different */
async function selects(browser, name, W) {
  const cfg = CFG[name], s = schemaOf(name).schema, tag = `${name} ${W}`;
  const t = await mount(browser, name, {width: W, editing: true, settings: cfg.settings(), blocks: cfg.blocks(), assets: [ASSET], globals: G});
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
      if (how === 'live') await t.emit({[id]: x.default}); else await t.redraw({settings: {[id]: x.default}});
      await frames(t);
    }
    eq(seen[0], seen[1], `${tag}: ${id} options, live equals redrawn`);
  }
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();
}

/* ------------------------------------------------------------ lifecycle */
async function lifecycle(browser, name, W) {
  const cfg = CFG[name], tag = `${name} ${W}`, blog = name === 'blog-featured-list';
  /* two instances */
  const t = await mount(browser, name, {width: W, editing: true, globals: G, instances: [{uid: 'a', settings: cfg.settings(), blocks: cfg.blocks()}, {uid: 'b', settings: cfg.settings(), blocks: cfg.blocks()}], assets: [ASSET]});
  const b0 = await probe(t, name, 'b');
  await t.emit({padding_top: 12, padding_top_mobile: 12, color_scheme: 'alt-scheme'}, undefined, 'a'); await frames(t);
  await t.emit({heading: 'Only in A'}, t.blockId('heading', 0, 'a'), 'a'); await frames(t);
  const a1 = await probe(t, name, 'a');
  ok(a1.bg === rgb.altBg && a1.pt === '12px' && a1.heading.html === 'Only in A', tag + ': the edit lands in instance A');
  eq(await probe(t, name, 'b'), b0, tag + ': instance B is untouched');
  eq(await t.page.evaluate(() => window.MateriaR7Stories.count()), 2, tag + ': two roots');
  await t.page.evaluate(() => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {section: {id: 'b'}, settings: {padding_bottom: 8, padding_bottom_mobile: 8}, live: true}})));
  await t.page.evaluate(id => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {section: 'shopify-section-b', blockId: id, settings: {heading: 'Only in B'}, live: false}})), t.blockId('heading', 0, 'b'));
  await frames(t, 3);
  const b2 = await probe(t, name, 'b');
  ok(b2.pb === '8px' && b2.heading.html === 'Only in B', tag + ': section as an object, a prefixed id and blockId are understood');
  eq((await probe(t, name, 'a')).heading.html, 'Only in A', tag + ': and A keeps its own');
  await t.page.evaluate(() => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {settings: {padding_top: 99, padding_top_mobile: 99}, live: true}})));
  await frames(t);
  eq((await probe(t, name, 'a')).pt, '12px', tag + ': a theme setting change is left alone');
  eq(t.errors, [], tag + ': no errors with two instances');
  await t.page.close();

  /* pictures and the scroll position on unrelated edits; an added block; redraws set up once */
  const u = await mount(browser, name, {width: W, editing: true, settings: cfg.settings(), blocks: cfg.blocks(), assets: [ASSET], globals: G});
  const imgSel = '#shopify-section-test .' + cfg.p + '__img';
  await u.page.evaluate(sel => { const i = document.querySelector(sel); i.__kept = true; window.__src = i.getAttribute('src'); window.__srcset = i.getAttribute('srcset'); }, imgSel);
  if (!blog) { await u.page.evaluate(() => { document.querySelector('[data-r7s-track]').scrollLeft = 400; }); await u.page.waitForTimeout(300); }
  const left0 = blog ? 0 : await u.page.evaluate(() => document.querySelector('[data-r7s-track]').scrollLeft);
  if (!blog) ok(left0 > 100, tag + ': the row scrolled');
  await u.emit(blog ? {padding_top: 20, padding_top_mobile: 20, enable_custom_style: true, title_color: '#ff8800', show_date: false} : {padding_top: 20, padding_top_mobile: 20, overlay_opacity: 50, enable_custom_style: true, text_color: '#ff8800', heading_size: 'large'}); await frames(u);
  await u.emit({heading: 'Edited'}, u.blockId('heading')); await frames(u);
  if (!blog) { await u.emit({heading: 'Edited card'}, u.blockId('card', 1)); await frames(u); }
  eq(await u.page.evaluate(sel => { const i = document.querySelector(sel); return [i.__kept === true, i.getAttribute('src') === window.__src, i.getAttribute('srcset') === window.__srcset]; }, imgSel), [true, true, true], tag + ': the picture is the same element with the same address after unrelated edits');
  if (!blog) eq(await u.page.evaluate(() => document.querySelector('[data-r7s-track]').scrollLeft), left0, tag + ': the row keeps its place on an unrelated edit');
  if (!blog) {
    /* one card's picture changes only that card; clearing it brings the placeholder */
    const second = u.blockId('card', 1);
    await u.emit({image: pic('second-own')}, second); await frames(u);
    eq(await u.page.evaluate(({sel, id}) => { const i = document.querySelector(sel), j = document.querySelector('[data-r7s-block="' + id + '"] img'); return [i.__kept === true, i.getAttribute('src') === window.__src, /second-own\.png/.test(j.getAttribute('src'))]; }, {sel: imgSel, id: second}), [true, true, true], tag + ': one card\'s picture changes, the others stay');
    await u.emit({image: ''}, second); await frames(u);
    ok(await u.page.evaluate(id => { const b = document.querySelector('[data-r7s-block="' + id + '"]'); return !b.querySelector('img') && !!b.querySelector('[data-r7s-ph]'); }, second), tag + ': clearing a picture brings the placeholder');
    /* a link added and taken away turns the button into a link and back */
    await u.emit({button_link: '/pages/one'}, second); await frames(u);
    ok(await u.page.evaluate(id => { const b = document.querySelector('[data-r7s-block="' + id + '"] .sc__btn'); return b.tagName === 'A' && b.getAttribute('href') === '/pages/one' && b.hasAttribute('data-theme-button') && b.hasAttribute('data-sl-button'); }, second), tag + ': a button given a link is a theme link button');
    await u.emit({button_link: ''}, second); await frames(u);
    ok(await u.page.evaluate(id => { const b = document.querySelector('[data-r7s-block="' + id + '"] .sc__btn'); return b.tagName === 'BUTTON' && b.type === 'button' && !b.hasAttribute('href'); }, second), tag + ': and with no link it is a button again');
    /* added card */
    const before = await u.page.evaluate(() => document.querySelectorAll('.sc__card').length);
    const blocks = cfg.blocks().concat([{type: 'card', settings: {heading: 'Added card', text: 'New line', button_link: '/pages/added', image: pic('added')}}]);
    await u.redraw({blocks}); await frames(u);
    const newId = 'test-b' + (blocks.length - 1);
    ok(await u.page.evaluate(id => { const b = document.querySelector('[data-r7s-block="' + id + '"]'); return !!b && /Added card/.test(b.textContent) && b.querySelector('a.sc__btn').getAttribute('href') === '/pages/added'; }, newId), tag + ': an added Card block draws');
    eq(await u.page.evaluate(() => [document.querySelectorAll('.sc__card').length, document.querySelectorAll('[data-r7s-dot]').length]), [before + 1, before + 1], tag + ': one more card and one more dot');
    await u.emit({heading: 'Added and edited'}, newId); await frames(u);
    ok(await u.page.evaluate(id => document.querySelector('[data-r7s-block="' + id + '"] .sc__title').textContent === 'Added and edited', newId), tag + ': the added card is live');
  } else {
    const blocks = [{type: 'text'}, {type: 'heading', settings: {heading: 'Added heading'}}];
    await u.redraw({blocks}); await frames(u);
    ok(await u.page.evaluate(() => { const h = document.querySelector('.bfl__heading'), l = document.querySelector('.bfl__lede'); return h.textContent === 'Added heading' && !!(l.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING); }), tag + ': blocks draw in their order');
    await u.emit({heading: 'Added and edited'}, 'test-b1'); await frames(u);
    eq(await u.page.evaluate(() => document.querySelector('.bfl__heading').textContent), 'Added and edited', tag + ': a redrawn block is live');
  }
  for (let i = 0; i < 3; i++) await u.redraw();
  await frames(u);
  eq(await u.page.evaluate(() => [window.MateriaR7Stories.count(), document.querySelectorAll('[data-r7s]').length]), [1, 1], tag + ': redraws leave one root set up');
  await u.page.evaluate(() => { const w = document.getElementById('shopify-section-test'), html = w.innerHTML; w.innerHTML = ''; w.innerHTML = html; });
  await frames(u, 4);
  eq(await u.page.evaluate(() => [window.MateriaR7Stories.count(), [...window.MateriaR7Stories.roots.keys()].every(r => r.isConnected)]), [1, true], tag + ': a section put in without an event is picked up, the old one dropped');
  await u.emit({padding_top: 44, padding_top_mobile: 44}); await frames(u);
  eq((await probe(u, name)).pt, '44px', tag + ': and it is live');
  if (!blog) {
    await u.page.evaluate(() => { window.__calls = 0; const o = Element.prototype.scrollTo; Element.prototype.scrollTo = function (...a) { window.__calls++; return o.apply(this, a); }; });
    await u.page.evaluate(() => document.querySelector('[data-r7s-dot="2"]').click());
    eq(await u.page.evaluate(() => window.__calls), 1, tag + ': one click scrolls once after four redraws');
  }
  eq(u.errors, [], tag + ': no errors in the lifecycle');
  await u.page.close();
}

/* ------------------------------------------------------------ first paint, reduced motion, phone feel */
async function paint(browser, name, W, editing) {
  const cfg = CFG[name], tag = `${name} ${W} ${editing ? 'builder' : 'storefront'}`, blog = name === 'blog-featured-list';
  const strip = q => ({...q, arrows: 0, dots: {shown: q.dots && q.dots.shown}});
  const raw = await mount(browser, name, {width: W, editing, settings: cfg.settings(), blocks: cfg.blocks(), assets: [], inlineScripts: false, globals: G});
  const first = await probe(raw, name);
  await raw.page.close();
  const t = await mount(browser, name, {width: W, editing, settings: cfg.settings(), blocks: cfg.blocks(), assets: [ASSET], globals: G});
  eq(blog ? await probe(t, name) : strip(await probe(t, name)), blog ? first : strip(first), tag + ': first paint equals the hydrated paint');
  /* tap targets: every link and button a finger uses (a post title inside its heading excepted: its picture above is a large link to the same post) */
  const small = await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test :is(a, button)')].filter(el => !el.closest('.bfl__title') && getComputedStyle(el).display !== 'none' && !el.hidden && getComputedStyle(el.parentElement).display !== 'none').map(el => { const r = el.getBoundingClientRect(); return [el.className, Math.round(r.width), Math.round(r.height)]; }).filter(([, w, h]) => w < 44 || h < 44));
  eq(small, [], tag + ': every link and button is at least 44px');
  eq(await t.page.evaluate(() => [document.querySelectorAll('#shopify-section-test h1').length, document.querySelectorAll('#shopify-section-test h2').length]), [0, 1], tag + ': one h2, no h1');
  const imgs = await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test img')].map(i => [i.getAttribute('loading'), i.hasAttribute('width') && i.hasAttribute('height'), i.hasAttribute('alt')]));
  ok(imgs.length > 0 && imgs.every(([l, s, a]) => l === 'lazy' && s && a), tag + ': pictures are lazy, sized and carry alt');
  if (!blog) ok(await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .sc__card img')].every((i, n) => i.getAttribute('alt') === 'Alt card' + n)), tag + ': a card picture\'s alt is the picture\'s own');
  else ok(await t.page.evaluate(() => { const m = document.querySelector('.bfl__media'); return m.getAttribute('aria-hidden') === 'true' && m.getAttribute('tabindex') === '-1' && m.querySelector('img').getAttribute('alt') === ''; }), tag + ': the featured picture link is one tap target for fingers and no extra stop for a keyboard');
  ok(await t.noOverflow(), tag + ': no sideways page scroll');
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();

  /* the theme's reveal on scroll: the hook is on the section, nothing is hidden, a live edit does not play it again */
  const a = await mount(browser, name, {width: W, editing, settings: cfg.settings(), blocks: cfg.blocks(), assets: [ASSET], theme: {scroll_animation: 'fade_up'}, globals: G});
  const reveal = () => a.page.evaluate(() => { const w = document.getElementById('shopify-section-test'); return [w.classList.contains('scroll-trigger'), w.classList.contains('fade_up'), getComputedStyle(w).opacity, w.getAnimations().length]; });
  eq(await reveal(), [true, true, '1', 0], tag + ': the theme reveal hook is on the section and the content shows');
  await a.emit({padding_top: 20, padding_top_mobile: 20}); await frames(a);
  eq(await reveal(), [true, true, '1', 0], tag + ': an edit does not replay the reveal');
  eq(a.errors, [], tag + ': no errors with the theme reveal');
  await a.page.close();

  /* reduced motion: no transitions, nothing moves by itself */
  const r = await mount(browser, name, {width: W, editing, settings: blog ? cfg.settings() : {autoplay: true, autorotate_speed: 2}, blocks: cfg.blocks(), assets: [ASSET], reducedMotion: 'reduce', globals: G});
  if (blog) {
    eq(await r.page.evaluate(() => [getComputedStyle(document.querySelector('.bfl__img')).transitionDuration, getComputedStyle(document.querySelector('.bfl')).opacity]), ['0s', '1'], tag + ': no transitions under reduced motion, content visible');
    if (W === 1366) { await r.root('.bfl__feature').hover(); eq(await r.css('.bfl__img', 'transform'), 'none', tag + ': no hover zoom under reduced motion'); }
  } else {
    eq(await r.page.evaluate(() => [getComputedStyle(document.querySelector('.sc__arrow')).transitionDuration, getComputedStyle(document.querySelector('.sc')).opacity]), ['0s', '1'], tag + ': no transitions under reduced motion, content visible');
    await r.page.waitForTimeout(2600);
    eq(await r.page.evaluate(() => document.querySelector('[data-r7s-track]').scrollLeft), 0, tag + ': autoplay does not run under reduced motion');
    await r.page.evaluate(() => document.querySelector('[data-r7s-dot="2"]').click()); await frames(r, 2);
    ok(await r.page.evaluate(() => document.querySelector('[data-r7s-track]').scrollLeft) > 100, tag + ': a dot moves the row at once under reduced motion');
  }
  eq(r.errors, [], tag + ': no errors under reduced motion');
  await r.page.close();
}

/* ------------------------------------------------------------ Blog Spotlight: the posts */
async function posts(browser, W, editing) {
  const name = 'blog-featured-list', tag = `${name} ${W} ${editing ? 'builder' : 'storefront'}`;
  const drawn = async (settings, globals = G) => { const t = await mount(browser, name, {width: W, editing, settings, blocks: CFG[name].blocks(), assets: [ASSET], globals}); const q = await probe(t, name); eq(t.errors, [], tag + ': no errors'); await t.page.close(); return q; };
  let q = await drawn({blog: BLOG});
  eq([q.title.text, q.title.href, q.media.href, q.media.img, q.read.href, q.meta.text], [TITLES[0], '/blogs/news/p0', '/blogs/news/p0', 'https://theme.test/post0.png', '/blogs/news/p0', '2026-01-02'], tag + ': the newest post is featured: title, link, picture, date');
  eq(q.excerpt.text, 'Body of post 0, the opening lines.', tag + ': a post with no excerpt shows its opening lines');
  eq([q.list.titles, q.list.hrefs], [[TITLES[1], TITLES[2], TITLES[3]], ['/blogs/news/p1', '/blogs/news/p2', '/blogs/news/p3']], tag + ': the next three posts are listed, with their links');
  q = await drawn({blog: BLOG, featured_article: POSTS[2]});
  eq(q.excerpt.text, 'Excerpt of post 2.', tag + ': the excerpt is the post\'s own');
  eq(q.list.titles, [TITLES[0], TITLES[1], TITLES[3]], tag + ': the picked post is featured and left out of the list');
  q = await drawn({blog: 'news'});
  eq(q.title.text, TITLES[0], tag + ': a blog saved by its handle works');
  q = await drawn({}, {...G, blog: BLOG2});
  eq(q.title.text, 'Journal entry one', tag + ': on a blog page an empty choice uses that blog');
  q = await drawn({blog: BLOG, posts_count: 3}, {...G, article: POSTS[1]});
  eq([q.title.text, q.list.titles], [TITLES[0], [TITLES[2], TITLES[3], TITLES[4]]], tag + ': on an article page the post being read is left out');
  const noPic = {...BLOG, handle: 'nopic', articles: [post(0, {image: null}), post(1, {image: null})]};
  q = await drawn({blog: noPic});
  eq([q.media.img, q.media.ph, q.list.n], [null, true, 1], tag + ': a post with no picture shows the placeholder; one post left lists one');
  const one = {...BLOG, handle: 'one', articles: [post(0)]};
  q = await drawn({blog: one});
  eq([q.title.text, q.list], [TITLES[0], null], tag + ': a blog with one post shows it alone');
  /* an empty blog: placeholders and a hint in the builder, nothing on the storefront */
  const e = await render(name, {editing, settings: {blog: EMPTY_BLOG}, globals: G});
  if (editing) ok(/data-r7s-placeholder/.test(e.html) && /Pick a blog with posts/.test(e.html) && !/<img/.test(e.html) && !/href="\/blogs\/[^"]+\//.test(e.html), tag + ': an empty blog draws placeholders and a hint, no post links');
  else ok(!/data-r7s=/.test(e.html) && !/<h2/.test(e.html) && !/data-r7s-space/.test(e.html), tag + ': an empty blog draws nothing on the storefront');
  const none = await render(name, {editing});
  eq(/data-r7s-placeholder/.test(none.html), editing, tag + ': the first preset with no blog is a placeholder in the builder only');
}

/* ------------------------------------------------------------ Card Slideshow: a native scroller */
async function scrollerChecks(browser, W, editing) {
  const name = 'slideshow-cards', tag = `${name} ${W} ${editing ? 'builder' : 'storefront'}`;
  const t = await mount(browser, name, {width: W, editing, blocks: CFG[name].blocks(), assets: [ASSET]});
  const settle = async () => { let last = -1; for (let i = 0; i < 40; i++) { await t.page.waitForTimeout(70); const x = await t.page.evaluate(() => document.querySelector('[data-r7s-track]').scrollLeft); if (x === last) return x; last = x; } return last; };
  const m = await t.page.evaluate(() => { const tr = document.querySelector('[data-r7s-track]'), cs = getComputedStyle(tr), it = tr.querySelector('.sc__card');
    return {x: cs.overflowX, snap: cs.scrollSnapType, over: cs.overscrollBehaviorX, touch: cs.touchAction, bar: cs.scrollbarWidth, align: getComputedStyle(it).scrollSnapAlign, wide: tr.scrollWidth - tr.clientWidth, step: it.getBoundingClientRect().width + parseFloat(cs.columnGap), tab: tr.getAttribute('tabindex'), label: tr.getAttribute('aria-label')}; });
  eq([m.x, m.snap, m.over, m.touch, m.bar, m.align], ['auto', 'x mandatory', 'contain', 'pan-x pan-y', 'none', 'start'], tag + ': a native snap scroller');
  ok(m.wide > 100 && m.tab === '0' && m.label === 'Take a closer look', tag + ': six cards are wider than the page; the row is a labelled tab stop');
  const src = fs.readFileSync(path.join(ROOT, 'shopify/assets', ASSET), 'utf8');
  ok(!/touch-action:\s*none|preventDefault\(\)[^}]*(wheel|touchmove)|addEventListener\('(wheel|touchmove|touchstart|pointermove)'/.test(src) && !/swiper/i.test(src), tag + ': no drag, wheel or touch-move handlers, no Swiper');
  /* touch-style: the scroll position is set directly, and comes to rest on a card */
  await t.page.evaluate(v => { document.querySelector('[data-r7s-track]').scrollLeft = v; }, m.step * 1.4);
  let x = await settle();
  ok(x > 0 && near(x / m.step, Math.round(x / m.step), 0.03), `${tag}: a touch-style scroll moves the row and snaps to a card (${x} of step ${m.step})`);
  await frames(t);
  eq((await probe(t, name)).dots.current, Math.round(x / m.step), tag + ': the dot follows the row');
  await t.page.evaluate(() => { document.querySelector('[data-r7s-track]').scrollLeft = 0; });
  await settle(); await frames(t);
  const arrows = async () => (await probe(t, name)).arrows;
  if (W === 1366) {
    let a = await arrows();
    eq([a.nav, a.prevOff, a.nextOff], [true, true, false], tag + ': arrows show, Previous is disabled at the start');
    eq(await t.page.evaluate(() => [...document.querySelectorAll('.sc__arrow')].map(b => { const r = b.getBoundingClientRect(); return [r.width, r.height, b.getAttribute('aria-label'), b.type]; })), [[44, 44, 'Previous', 'button'], [44, 44, 'Next', 'button']], tag + ': arrows are 44px labelled buttons');
    await t.root('[data-r7s-next]').click();
    x = await settle();
    ok(near(x, m.step, 2), tag + ': Next moves the row one card');
    a = await arrows();
    eq([a.prevOff, a.nextOff], [false, false], tag + ': Previous is enabled after moving');
    for (let i = 0; i < 8 && !(await arrows()).nextOff; i++) { await t.root('[data-r7s-next]').click(); await settle(); await frames(t); }
    x = await settle(); a = await arrows();
    ok(near(x, m.wide, 1.5) && a.nextOff && !a.prevOff, tag + ': Next is disabled at the end');
    eq((await probe(t, name)).dots.current, (await probe(t, name)).dots.n - 1, tag + ': the last dot is current at the end');
    await t.root('[data-r7s-prev]').click();
    ok(await settle() < x - 10, tag + ': Previous moves it back');
    await t.page.evaluate(() => { document.querySelector('[data-r7s-track]').scrollLeft = 0; }); await settle(); await frames(t);
    if (editing) {
      await t.emit({show_arrows: false}); await frames(t, 3);
      eq((await arrows()).nav, false, tag + ': Show arrows off hides them, live');
      await t.emit({show_arrows: true}); await frames(t, 3);
      eq((await arrows()).nav, true, tag + ': and on shows them again');
    }
  } else eq((await arrows()).nav, false, tag + ': no arrows on a phone, the finger moves the row');
  /* dots: one per place the row can rest, each a 44px button */
  const d = await probe(t, name);
  const stops = await t.page.evaluate(() => { const tr = document.querySelector('[data-r7s-track]'), max = tr.scrollWidth - tr.clientWidth, edge = parseFloat(getComputedStyle(tr).paddingLeft), base = tr.getBoundingClientRect().left; return [...new Set([...tr.children].map(c => Math.round(Math.min(max, c.getBoundingClientRect().left - base - edge))))].length; });
  eq([d.dots.shown, d.dots.n, d.dots.current], [true, stops, 0], tag + ': one dot for each place the row can rest');
  await t.page.evaluate(() => document.querySelector('[data-r7s-dot="2"]').click());
  x = await settle(); await frames(t);
  ok(near(x, Math.min(m.step * 2, m.wide), 2) && (await probe(t, name)).dots.current === 2, tag + ': a dot takes the row to its card and becomes current');
  await t.page.evaluate(() => { document.querySelector('[data-r7s-track]').scrollLeft = 0; }); await settle();
  /* keys on the focused row */
  await t.root('[data-r7s-track]').focus();
  await t.page.keyboard.press('ArrowRight');
  x = await settle();
  ok(near(x, m.step, 2), `${tag}: the right arrow key moves the row one card (${x})`);
  await t.page.keyboard.press('ArrowRight'); await settle();
  await t.page.keyboard.press('ArrowLeft');
  ok(near(await settle(), m.step, 2), tag + ': the left arrow key moves it back');
  eq(await t.page.evaluate(() => ['ArrowDown', 'ArrowUp', ' ', 'PageDown', 'ArrowRight'].map(key => { const e = new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true}); document.querySelector('[data-r7s-track]').dispatchEvent(e); return e.defaultPrevented; })), [false, false, false, false, true], tag + ': only left and right are taken; up, down, space and page keys stay with the page');
  /* a card picked in the builder comes into view */
  await t.page.evaluate(() => { document.querySelector('[data-r7s-track]').scrollLeft = 0; }); await settle();
  await t.page.evaluate(() => document.querySelectorAll('.sc__card')[3].dispatchEvent(new CustomEvent('shopify:block:select', {bubbles: true})));
  await settle();
  ok(await t.page.evaluate(() => { const r = document.querySelectorAll('.sc__card')[3].getBoundingClientRect(), b = document.querySelector('[data-r7s-track]').getBoundingClientRect(); return r.left >= b.left - 1 && r.left < b.right - 40; }), tag + ': a picked card is brought into view');
  ok(await t.noOverflow(), tag + ': no sideways page scroll');
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();

  /* a row that fits: no arrows, no dots, not a tab stop */
  const f = await mount(browser, name, {width: W, editing, blocks: [{type: 'heading'}, ...cardsOf(2)], settings: {card_width: 40, card_width_mobile: 100}, assets: [ASSET]});
  await frames(f, 3);
  const q = await probe(f, name);
  if (W === 1366) eq([q.arrows.nav, q.dots.n, await f.page.evaluate(() => document.querySelector('[data-r7s-track]').hasAttribute('tabindex'))], [false, 0, false], tag + ': two cards that fit: no arrows, no dots, no tab stop');
  else eq([q.dots.n > 1, await f.page.evaluate(() => document.querySelector('[data-r7s-track]').getAttribute('tabindex'))], [true, '0'], tag + ': two full width cards on a phone still scroll');
  eq(f.errors, [], tag + ': no errors with two cards');
  await f.page.close();
  /* one card, and none */
  const o = await mount(browser, name, {width: W, editing, blocks: [{type: 'heading'}, ...cardsOf(1)], assets: [ASSET]});
  eq(await o.page.evaluate(() => [document.querySelectorAll('.sc__card').length, !!document.querySelector('[data-r7s-dots]'), !!document.querySelector('.sc__nav')]), [1, false, false], tag + ': one card: no dots or arrows');
  ok(await o.noOverflow(), tag + ': one card: no sideways page scroll');
  await o.page.close();
  const e = await render(name, {editing, blocks: [{type: 'heading'}]});
  eq([/Add a Card block/.test(e.html), /data-r7s=/.test(e.html)], [editing, editing], tag + ': no cards: a hint in the builder, nothing on the storefront');
  const p = await render(name, {editing});
  ok(/data-r7s-ph/.test(p.html) && !/<img/.test(p.html) && /New arrivals/.test(p.html), tag + ': the first preset draws placeholder cards with words');
}

/* ------------------------------------------------------------ Card Slideshow: autoplay */
async function autoplay(browser, W) {
  const name = 'slideshow-cards', tag = `${name} ${W} autoplay`;
  const t = await mount(browser, name, {width: W, height: 1200, editing: false, settings: {autoplay: true, autorotate_speed: 2}, blocks: CFG[name].blocks(), assets: [ASSET]});
  const left = () => t.page.evaluate(() => document.querySelector('[data-r7s-track]').scrollLeft);
  const step = await t.page.evaluate(() => { const tr = document.querySelector('[data-r7s-track]'), it = tr.querySelector('.sc__card'); return it.getBoundingClientRect().width + parseFloat(getComputedStyle(tr).columnGap); });
  await t.page.mouse.move(1, 1190);
  await t.page.waitForTimeout(2900);
  ok(near(await left(), step, 2), tag + ': moves one card after the time per slide');
  /* hover holds it */
  await t.root('[data-r7s-track]').hover();
  const h0 = await left(); await t.page.waitForTimeout(2600);
  eq(await left(), h0, tag + ': waits while a pointer is over it');
  await t.page.mouse.move(1, 1190);
  await t.page.waitForTimeout(2700);
  ok(await left() > h0 + 10, tag + ': goes on when the pointer leaves');
  /* focus holds it */
  await t.page.evaluate(() => document.querySelector('[data-r7s-track]').focus());
  const f0 = await left(); await t.page.waitForTimeout(2600);
  eq(await left(), f0, tag + ': waits while focus is in it');
  await t.page.evaluate(() => document.activeElement.blur());
  /* a finger on it holds it */
  await t.page.evaluate(() => document.querySelector('[data-r7s-track]').dispatchEvent(new PointerEvent('pointerdown', {pointerType: 'touch', bubbles: true})));
  const t0 = await left(); await t.page.waitForTimeout(2600);
  eq(await left(), t0, tag + ': waits while a finger is on it');
  await t.page.evaluate(() => document.dispatchEvent(new PointerEvent('pointerup', {pointerType: 'touch', bubbles: true})));
  /* a hidden tab holds it */
  await t.page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => true}); document.dispatchEvent(new Event('visibilitychange')); });
  const v0 = await left(); await t.page.waitForTimeout(2600);
  eq(await left(), v0, tag + ': waits in a hidden tab');
  await t.page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => false}); document.dispatchEvent(new Event('visibilitychange')); });
  /* off screen holds it */
  await t.page.evaluate(() => { const s = document.createElement('div'); s.style.height = '3000px'; document.body.append(s); scrollTo(0, 2800); });
  await t.page.waitForTimeout(200);
  const o0 = await left(); await t.page.waitForTimeout(2600);
  eq(await left(), o0, tag + ': waits off screen');
  await t.page.evaluate(() => scrollTo(0, 0));
  /* at the end it goes back to the start */
  await t.page.evaluate(() => { const tr = document.querySelector('[data-r7s-track]'); tr.scrollLeft = tr.scrollWidth; });
  await t.page.waitForTimeout(2900);
  eq(await left(), 0, tag + ': from the last card back to the first');
  ok(await t.page.evaluate(() => scrollY === 0), tag + ': the page itself is never scrolled');
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();
  /* off by default: nothing moves */
  const n = await mount(browser, name, {width: W, editing: false, blocks: CFG[name].blocks(), assets: [ASSET]});
  await n.page.waitForTimeout(2600);
  eq(await n.page.evaluate(() => document.querySelector('[data-r7s-track]').scrollLeft), 0, tag + ': off by default');
  await n.page.close();
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
          if (name === 'blog-featured-list') await posts(browser, W, editing);
          else await scrollerChecks(browser, W, editing);
        }
        await selects(browser, name, W);
        await lifecycle(browser, name, W);
        if (name === 'slideshow-cards') await autoplay(browser, W);
      }
    }
  } finally { await browser.close(); }
  console.log(`stories round 7: ${checks} checks passed (${names.join(', ')}; 375 and 1366, builder and storefront)`);
})().catch(e => { console.error(e); process.exitCode = 1; });
