/* Round 5, Featured blog posts (sections/blog-posts.storelib) with the real
   theme priority rules, the theme CSS, Swiper, global.js and the group
   controller live-blog-slideshow.js.

   1. Schema: shared problems, every HEAD id kept, the shared group order.
   2. Real posts: the picked blog's articles (by handle or object), the blog
      being read on a blog or article page, the post being read left out, as
      many as set; with no posts the builder shows placeholder cards that
      claim nothing and the storefront shows nothing.
   3. Every visible setting and select option at 375 and 1366: a redraw looks
      different, the same change sent live looks like the redraw (unless it
      is listed as redraw only), and sending the old value back restores it.
   4. Theme first; custom colours, fonts, heading weight and line spacing win
      over the theme's priority rules (data-own-* only while on), live and
      after a redraw, on the element and a descendant; off restores the theme.
      View all is a theme button (hover from Theme settings > Buttons).
   5. First paint equals the hydrated paint; autoplay waits off screen and is
      off under reduced motion; two instances stay independent; a redraw sets
      up once.
   5b. With blocks (the blog page's Subheading, Heading and Text): every block
      setting and the settings that reach the blocks (Custom heading size,
      Heading size, Gap between heading blocks) look different after a redraw,
      and the same change sent live looks like the redraw.
   6. The saved instances (templates/blog.json, templates/article.json) look as
      they did at HEAD, with enable_custom_style on (their View all colours).
      The blog page's instance, made again with blocks in the builder (0674ef4),
      is compared with that commit.

   LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-r5-blog-slideshow-blog.cjs */
const fs = require('fs'), path = require('path'), {execSync} = require('child_process'), assert = require('assert/strict');
const {launch, mount: mountWith, render, schemaOf, schemaProblems, themeControls, THEME_VARS} = require('./media-fixture.cjs');
/* The heading without blocks unless blocks are given (the preset's Heading and Text blocks are checked in blocks()). */
const mount = (browser, name, o = {}) => mountWith(browser, name, o.instances ? o : {blocks: [], ...o});
const {engine} = require('./theme-featured-product-round5.cjs');
const ROOT = path.join(__dirname, '..');
/* The sections as they were before round 5 (the commit before the round's work in progress), or HEAD. */
const BEFORE = (() => { try { return execSync('git rev-parse --verify -q 2002b49^{commit}', {cwd: ROOT, encoding: 'utf8'}).trim() || 'HEAD'; } catch (_) { return 'HEAD'; } })();
const A = ['swiper-bundle.min.css', 'pagination-styles.css', 'swiper-bundle.min.js', 'motion.min.js', 'global.js', 'live-blog-slideshow.js'];
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'}, MONO = {family: 'Courier New', fallback_families: 'monospace'};
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const only = process.argv.slice(2);

const post = (i, ratio = 1.5) => ({id: 100 + i, title: 'Post number ' + i, handle: 'news/post-' + i, url: '/blogs/news/post-' + i, author: 'Writer ' + i, published_at: '2026-0' + i + '-02', content: '<p>Body ' + i + '</p>', image: {url: 'https://theme.test/p' + i + '.png', src: 'https://theme.test/p' + i + '.png', width: 1200, height: Math.round(1200 / ratio), aspect_ratio: ratio, alt: 'Picture ' + i}});
const BLOG = {id: 7, title: 'News', handle: 'news', url: '/blogs/news', articles: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => post(i)), articles_count: 9};
const G = {blogs: {news: BLOG}};
const BASE = {blog: 'news', items_to_show: 8, heading: 'From the <em>blog</em>', description: '<p>Notes from the studio</p>', show_view_all: true, carousel_pagination: 'show_dots'};

async function sig(page, uid = 'test') {
  return page.evaluate(uid => {
    document.getAnimations().forEach(a => { if (a instanceof CSSTransition) a.finish(); });
    const W = document.getElementById('shopify-section-' + uid), R = W.querySelector('[data-bp-root]');
    if (!R) return null;
    const cs = (el, props) => el ? Object.fromEntries(props.map(p => [p, p.startsWith('--') ? getComputedStyle(el).getPropertyValue(p).trim() : getComputedStyle(el)[p]])) : null;
    const vis = el => el && getComputedStyle(el).display !== 'none' && el.getClientRects().length ? el : null;
    const T = ['fontFamily', 'fontWeight', 'fontSize', 'lineHeight', 'letterSpacing', 'color', 'textAlign'];
    const h = R.querySelector('.section__header-heading'), d = R.querySelector('.section__header-des'), v = vis(R.querySelector('[data-bp-view-all]'));
    const slider = R.querySelector('[data-bp-slider]'), sw = slider?.globalSlide, slides = [...R.querySelectorAll('.swiper-slide')];
    const img = R.querySelector('.blog-posts-image > a, .blog-posts-placeholder .blog-posts-image');
    const shown = slides.filter(s => { const r = s.getBoundingClientRect(), sr = slider.getBoundingClientRect(); return r.right > sr.left + 2 && r.left < sr.right - 2; }).length;
    const out = {
      root: cs(R, ['backgroundColor', 'paddingTop', 'paddingBottom']), width: cs(R.firstElementChild, ['maxWidth']), wcls: R.firstElementChild.className,
      header: cs(R.querySelector('.section__header'), ['textAlign', 'marginBottom']), row: R.querySelector('.section__header > div')?.className.replace(/\s+/g, ' ').trim(),
      h: h && {t: h.innerHTML.trim(), ...cs(h, T), em: cs(h.querySelector('em'), ['fontFamily', 'fontWeight', 'letterSpacing'])},
      d: d && {t: d.textContent.trim(), ...cs(d, T), p: cs(d.querySelector('p'), ['fontFamily', 'color'])},
      v: v && {tag: v.tagName, t: v.textContent.trim(), href: v.getAttribute('href'), ...cs(v, ['backgroundColor', 'color', 'borderTopLeftRadius', '--mb-hover-bg', '--mb-hover-text'])},
      cards: slides.length, titles: slides.map(s => s.querySelector('.blog-posts-title')?.textContent.trim()).join('|'),
      title: cs(R.querySelector('.blog-posts-title a, .blog-posts-title span'), ['color', 'fontFamily', 'fontSize']),
      info: cs(R.querySelector('.blog-posts-info'), ['textAlign']), bottom: cs(R.querySelector('.blog-posts-bottom'), ['justifyContent', 'color', 'fontFamily']),
      author: !!vis(R.querySelector('.blog-posts-author')), date: !!vis(R.querySelector('.blog-posts-date')),
      ratio: img ? Math.round(img.getBoundingClientRect().width / Math.max(1, img.getBoundingClientRect().height) * 100) / 100 : null,
      slide: slides[0] ? Math.round(slides[0].getBoundingClientRect().width) : 0, shown,
      swiper: sw && !sw.destroyed ? {loop: !!sw.params.loop, autoplay: !!(sw.params.autoplay && sw.params.autoplay.enabled), delay: sw.params.autoplay?.delay || 0, progress: sw.params.pagination?.type} : null,
      pag: vis(R.querySelector('.swiper-pagination')) && {...cs(R.querySelector('.swiper-pagination'), ['justifyContent']), style: slider.dataset.paginationStyle, bullet: cs(R.querySelector('.swiper-pagination-bullet, .swiper-pagination-progressbar-fill'), ['width', 'borderTopLeftRadius'])},
      reveal: slider?.classList.contains('reveal_on_scroll'),
      sub: cs(R.querySelector('.section__header-sub'), T.concat(['textTransform', 'opacity'])), subT: R.querySelector('.section__header-sub')?.textContent.trim(),
      blocks: cs(R.querySelector('.bp-head-blocks'), ['rowGap']), dw: cs(R.querySelector('.section__header-des'), ['maxWidth', 'marginTop']), hm: cs(R.querySelector('.section__header-heading'), ['marginBottom']),
    };
    return JSON.parse(JSON.stringify(out));
  }, uid);
}
const diff = (a, b, p = '') => { const o = []; if (JSON.stringify(a) === JSON.stringify(b)) return o; if (a && b && typeof a === 'object' && typeof b === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o.push(...diff(a[k], b[k], p + '.' + k)); return o; } return [p + ': ' + JSON.stringify(a) + ' / ' + JSON.stringify(b)]; };
function values(x) {
  const cur = x.id in BASE ? BASE[x.id] : x.default;
  switch (x.type) {
    case 'range': return [cur === x.max ? x.min : x.max];
    case 'select': return x.options.map(o => o.value).filter(v => v !== cur);
    case 'checkbox': return [!cur];
    case 'color': return ['#ab12cd'];
    case 'color_scheme': return ['alt-scheme'];
    case 'text': return x.id === 'custom_ratio' ? ['2:1'] : ['Edited words'];
    case 'inline_richtext': return ['Edited <em>heading</em>'];
    case 'richtext': return ['<p>Edited <em>text</em></p>'];
    case 'font_picker': return [FONT];
    case 'blog': return [];
    default: return [];
  }
}
const PRE = {view_all_label: {show_view_all: true}, autorotate_speed: {autoplay: true}, custom_ratio: {image_ratio: 'custom'}, heading_weight: {enable_custom_weight: true}, heading_line_height: {enable_custom_size: true}, heading_letter_spacing: {enable_custom_size: true},
  heading_font: {enable_custom_fonts: true}, body_font: {enable_custom_fonts: true}, pagination_style: {carousel_pagination: 'show_dots'}, pagination_position: {carousel_pagination: 'show_dots'}, items_per_row: {}, column_gap: {}};
const STYLE_IDS = ['view_all_bg_color', 'view_all_text_color', 'view_all_hover_bg_color', 'view_all_hover_text_color', 'heading_color', 'text_color', 'title_color', 'meta_color'];
for (const id of STYLE_IDS) PRE[id] = {enable_custom_style: true};
/* Redraw only: they change which posts or which elements exist. */
const STRUCTURAL = new Set(['blog', 'items_to_show', 'show_view_all', 'carousel_pagination', 'show_author', 'show_date', 'image_ratio:adapt', 'header_alignment:center', 'header_alignment']);
const SAME = {375: new Set(['carousel_pagination:show_dots_on_mobile', 'column_gap', 'items_per_row', 'pagination_position', 'section_width:fluid_container', 'section_width:container', 'section_width:stretch_width']), 1366: new Set(['items_per_row_mobile', 'section_width:fluid_container', 'column_gap'])};
const SAME_VALUE = {enable_custom_style: [true], enable_custom_size: [true] /* on with the theme's own values */, image_ratio: ['adapt'] /* the post pictures here are 3:2, like the fallback */, heading_weight: [], pagination_style: [], reveal: [true] /* storefront-only reveal; the class is checked */};
const ELSEWHERE = new Set(['autoplay', 'autorotate_speed', 'infinite', 'view_all_hover_bg_color', 'view_all_hover_text_color', 'reset_spacing']);

async function controls(browser) {
  const {schema} = schemaOf('blog-posts'), fails = [];
  const RESET = Object.fromEntries(schema.settings.filter(x => x.id).map(x => [x.id, x.default]));
  const items = schema.settings.filter(x => x.id && !x.hidden && (!only.length || only[0] === 'controls' || only.includes(x.id)));
  for (const width of [375, 1366]) {
    const L = await mount(browser, 'blog-posts', {width, assets: A, settings: BASE, globals: G});
    const R = await mount(browser, 'blog-posts', {width, assets: A, settings: BASE, globals: G});
    for (const x of items) {
      if (ELSEWHERE.has(x.id)) continue;
      const pre = {...(PRE[x.id] || {})};
      for (const v of values(x)) {
        const tag = x.id + '=' + JSON.stringify(v).slice(0, 24) + '@' + width;
        const same = (SAME_VALUE[x.id] || []).includes(v) || SAME[width].has(x.id) || SAME[width].has(x.id + ':' + v);
        await L.redraw({settings: {...RESET, ...BASE, ...pre}}); await frames(L.page); await L.page.waitForTimeout(80);
        const before = await sig(L.page);
        await R.redraw({settings: {...RESET, ...BASE, ...pre, [x.id]: v}}); await frames(R.page); await R.page.waitForTimeout(80);
        const redrawn = await sig(R.page);
        if (!same && !diff(before, redrawn).length) fails.push(tag + ': no visible change after a redraw');
        if (STRUCTURAL.has(x.id) || STRUCTURAL.has(x.id + ':' + v)) continue;
        await L.emit({[x.id]: v}); await frames(L.page); await L.page.waitForTimeout(150);
        const live = await sig(L.page);
        const d = diff(live, redrawn);
        if (d.length) fails.push(tag + ': live differs from redraw: ' + d.slice(0, 4).join(' | '));
        await L.emit({[x.id]: x.default ?? (x.type === 'checkbox' ? false : '')}); await frames(L.page); await L.page.waitForTimeout(150);
        checks++;
      }
    }
    eq(L.errors.concat(R.errors), [], 'no errors in the sweep');
    await L.page.close(); await R.page.close();
  }
  if (fails.length) console.log(fails.join('\n'));
  eq(fails, [], 'every control live and after a redraw');
}

async function content(browser) {
  /* real posts: by handle, by object, current blog; current article left out; limit */
  for (const [label, settings, globals, want] of [
    ['handle', {blog: 'news', items_to_show: 4}, G, 'Post number 1|Post number 2|Post number 3|Post number 4'],
    ['object', {blog: BLOG, items_to_show: 3}, G, 'Post number 1|Post number 2|Post number 3'],
    ['blog page', {blog: '', items_to_show: 2}, {...G, blog: BLOG}, 'Post number 1|Post number 2'],
    ['article page', {blog: 'news', items_to_show: 3}, {...G, article: BLOG.articles[1]}, 'Post number 1|Post number 3|Post number 4'],
  ]) {
    const r = await render('blog-posts', {editing: false, settings: {...BASE, ...settings}, globals});
    const titles = [...r.html.matchAll(/class="no-underline heading-color">\s*([^<]*?)\s*<\/a>/g)].map(m => m[1]).join('|');
    eq(titles, want, 'posts from the blog: ' + label);
    ok(r.html.includes('href="/blogs/news"'), 'View all links to the blog: ' + label);
  }
  const empty = await render('blog-posts', {editing: false, settings: {...BASE, blog: 'missing'}, globals: G});
  eq(empty.html.replace(/<style[\s\S]*?<\/style>/g, '').trim(), '', 'storefront with no posts shows nothing');
  const preview = await render('blog-posts', {editing: true, settings: {}, globals: {}});
  ok(/blog-posts-placeholder/.test(preview.html) && !/Tony|Blanco|2025/.test(preview.html), 'builder preview: placeholder cards that name no one');
  ok(/<button type="button" class="btn_view-all/.test((await render('blog-posts', {editing: true, settings: {show_view_all: true}, globals: {}})).html), 'View all with no blog is a button, not an empty link');
}

async function themeFirst(browser) {
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const t = await mount(browser, 'blog-posts', {width, editing, assets: A, settings: BASE, globals: G});
    const H = '.section__header-heading', HE = H + ' em', T3 = '.blog-posts-title a', DT = '.blog-posts-date', DP = '.section__header-des p', V = '[data-bp-view-all]';
    const settle = () => t.page.evaluate(() => document.getAnimations().forEach(a => { if (a instanceof CSSTransition) a.finish(); }));
    const read = async () => (await settle(), {h: await t.css(H, 'fontFamily'), he: await t.css(HE, 'fontFamily'), hw: await t.css(H, 'fontWeight'), hew: await t.css(HE, 'fontWeight'), lh: await t.css(H, 'lineHeight'), ls: await t.css(HE, 'letterSpacing'), hc: await t.css(H, 'color'), t3: await t.css(T3, 'fontFamily'), t3c: await t.css(T3, 'color'), dt: await t.css(DT, 'fontFamily'), dtc: await t.css(DT, 'color'), dp: await t.css(DP, 'fontFamily'), dpc: await t.css(DP, 'color'), v: await t.css(V, 'backgroundColor'), vr: await t.css(V, 'borderTopLeftRadius'), root: await t.css('[data-bp-root]', 'backgroundColor')});
    const theme = await read();
    eq([theme.h, theme.he, theme.hw, theme.hc, theme.t3, theme.dp, theme.dpc, theme.root, theme.vr], ['Georgia', 'Georgia', '700', 'rgb(255, 255, 255)', 'Georgia', 'Arial', 'rgb(204, 204, 204)', 'rgb(24, 32, 40)', '12px'], 'theme first ' + width);
    await t.page.locator('#shopify-section-test ' + V).hover({force: true}); await t.page.waitForTimeout(60);
    ok(await t.css(V, 'backgroundColor') !== theme.v, 'View all hover follows the theme'); await t.page.mouse.move(1, 1);
    const own = (sel, a) => t.page.locator('#shopify-section-test ' + sel).first().evaluate((el, a) => !!el.closest('[' + a + ']'), a);
    const ON = {enable_custom_fonts: true, heading_font: FONT, body_font: MONO, enable_custom_weight: true, heading_weight: '300', enable_custom_size: true, heading_line_height: 1.9, heading_letter_spacing: 3, enable_custom_style: true, heading_color: '#ee1122', text_color: '#11ee22', title_color: '#2233ee', meta_color: '#ee8800', view_all_bg_color: '#118811'};
    const OFF = {enable_custom_fonts: false, enable_custom_weight: false, enable_custom_size: false, enable_custom_style: false};
    const want = async label => {
      const r = await read(), fs = parseFloat(await t.css(H, 'fontSize'));
      ok(/Verdana/.test(r.h) && /Verdana/.test(r.he) && /Verdana/.test(r.t3) && /Courier New/.test(r.dt) && /Courier New/.test(r.dp), label + ' fonts ' + JSON.stringify(r));
      eq([r.hw, r.hew, Math.round(parseFloat(r.lh) / fs * 10) / 10, r.ls, r.hc, r.dpc, r.t3c, r.dtc, r.v], ['300', '300', 1.9, '3px', 'rgb(238, 17, 34)', 'rgb(17, 238, 34)', 'rgb(34, 51, 238)', 'rgb(238, 136, 0)', 'rgb(17, 136, 17)'], label);
      ok(await own(H, 'data-own-font') && await own(H, 'data-own-weight') && await own(H, 'data-own-size'), label + ' opt-out attributes');
    };
    const back = async label => { eq(await read(), theme, label + ' theme restored'); ok(!(await own(H, 'data-own-font')) && !(await own(H, 'data-own-weight')) && !(await own(H, 'data-own-size')), label + ' attributes gone'); };
    await t.emit(ON); await frames(t.page); await want('live on ' + width);
    await t.emit(OFF); await frames(t.page); await back('live off ' + width);
    await t.redraw({settings: {...BASE, ...ON}}); await frames(t.page); await want('redraw on ' + width);
    await t.redraw({settings: {...BASE, ...OFF}}); await frames(t.page); await back('redraw off ' + width);
    await t.emit({color_scheme: 'alt-scheme'}); await frames(t.page);
    eq([await t.css('[data-bp-root]', 'backgroundColor'), await t.css(H, 'color')], ['rgb(250, 250, 250)', 'rgb(16, 16, 16)'], 'scheme live');
    ok(await t.noOverflow(), 'no sideways scroll ' + width);
    eq(t.errors, [], 'no errors');
    await t.page.close();
  }
  const t = await mount(browser, 'blog-posts', {width: 1366, assets: A, settings: BASE, globals: G, priority: 'off'});
  eq([await t.css('.section__header-heading', 'fontFamily'), await t.css('.blog-posts-title a', 'fontFamily')], ['Georgia', 'Georgia'], 'priority off');
  await t.page.close();
}

async function lifecycle(browser) {
  /* first paint = hydrated */
  for (const settings of [BASE, {...BASE, enable_custom_fonts: true, heading_font: FONT, body_font: MONO, enable_custom_weight: true, heading_weight: '300', enable_custom_size: true, heading_line_height: 1.8, enable_custom_style: true, heading_color: '#ee1122', meta_color: '#ee8800', view_all_bg_color: '#118811'}])
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const a = await mount(browser, 'blog-posts', {width, editing, settings, globals: G, assets: ['swiper-bundle.min.css']}); const s1 = await sig(a.page); await a.page.close();
      const b = await mount(browser, 'blog-posts', {width, editing, settings, globals: G, assets: ['swiper-bundle.min.css', 'live-blog-slideshow.js']}); const s2 = await sig(b.page); await b.page.close();
      eq(diff(s1, s2), [], 'first paint equals hydrated ' + width + (editing ? ' editor' : ' storefront'));
    }
  /* autoplay: per instance, waits off screen; two instances independent; redraw sets up once */
  const two = await mount(browser, 'blog-posts', {width: 1366, height: 700, editing: false, assets: A, globals: G, instances: [{uid: 'a', settings: {...BASE, autoplay: true, autorotate_speed: 2, infinite: true}}, {uid: 'b', settings: {...BASE, autoplay: false}}]});
  await two.page.evaluate(() => { document.body.style.paddingBottom = '2000px'; });
  await two.page.mouse.move(1, 1); await two.page.waitForTimeout(900);
  const run = uid => two.page.evaluate(uid => { const sw = document.querySelector('#shopify-section-' + uid + ' [data-bp-slider]').globalSlide; return !!(sw && sw.autoplay && sw.autoplay.running); }, uid);
  eq([await run('a'), await run('b')], [true, false], 'autoplay is per instance');
  await two.page.evaluate(() => scrollTo(0, 2200)); await two.page.waitForTimeout(500);
  eq(await run('a'), false, 'off screen: waits');
  await two.page.evaluate(() => scrollTo(0, 0)); await two.page.waitForTimeout(600);
  eq(await run('a'), true, 'back on screen: runs');
  await two.emit({heading_font_size: 41, items_per_row: 2}, undefined, 'b'); await frames(two.page); await two.page.waitForTimeout(150);
  eq([await two.css('.section__header-heading', 'fontSize', 'a'), await two.css('.section__header-heading', 'fontSize', 'b')], ['24px', '41px'], 'an edit stays in its instance');
  eq(await two.page.evaluate(() => [...document.querySelectorAll('[data-bp-slider]')].map(s => s.globalSlide.params.breakpoints[1025].slidesPerView)), ['4', '2'], 'b rebuilt with its own layout, a untouched');
  await two.redraw({uid: 'b'}); await two.redraw({uid: 'b'}); await frames(two.page);
  eq(await two.page.evaluate(() => window.MateriaBlogSlideshow.blogs.size), 2, 'redraw sets up once');
  eq(two.errors, [], 'no errors');
  await two.page.close();
  const rm = await mount(browser, 'blog-posts', {width: 375, editing: false, reducedMotion: 'reduce', assets: A, globals: G, settings: {...BASE, autoplay: true, autorotate_speed: 2}});
  await rm.page.waitForTimeout(900);
  eq(await rm.page.evaluate(() => { const sw = document.querySelector('[data-bp-slider]').globalSlide; return [!!sw.autoplay.running, sw.params.speed]; }), [false, 0], 'reduced motion: no autoplay, no movement');
  await rm.page.close();
}

/* The blog page's blocks, as templates/blog.json saves them. */
const SAVED_BLOCKS = (() => { const sec = JSON.parse(fs.readFileSync(path.join(ROOT, 'templates/blog.json'), 'utf8')).sections['blog-posts-1793646112970']; return sec.block_order.map(id => ({type: sec.blocks[id].type, settings: sec.blocks[id].settings})); })();
const BVALUES = {color: ['#ab12cd'], text: ['Edited words'], inline_richtext: ['Edited <em>heading</em>'], richtext: ['<p>Edited <em>text</em></p>']};
async function blocks(browser) {
  const {schema} = schemaOf('blog-posts'), fails = [];
  const bdef = t => Object.fromEntries((schema.blocks.find(b => b.type === t).settings || []).filter(x => x.id).map(x => [x.id, x.default]));
  const base = SAVED_BLOCKS.map(b => ({type: b.type, settings: {...bdef(b.type), ...b.settings}}));
  const SEC = {heading_subtext_gap: [30], enable_custom_heading_size: [false], heading_font_size: [41]};
  const RESET = {...Object.fromEntries(schema.settings.filter(x => x.id).map(x => [x.id, x.default])), ...BASE};
  for (const width of [375, 1366]) {
    const L = await mountWith(browser, 'blog-posts', {width, assets: A, settings: BASE, globals: G, blocks: base});
    const R = await mountWith(browser, 'blog-posts', {width, assets: A, settings: BASE, globals: G, blocks: base});
    const cases = [];
    for (const [id, vals] of Object.entries(SEC)) for (const v of vals) cases.push({id, v});
    base.forEach((b, i) => { for (const x of schema.blocks.find(t => t.type === b.type).settings) {
      if (!x.id || x.hidden) continue;
      const cur = b.settings[x.id];
      const vals = x.type === 'select' ? x.options.map(o => o.value).filter(v => v !== cur) : x.type === 'range' ? [cur === x.max ? x.min : x.max] : BVALUES[x.type] || [];
      for (const v of vals) cases.push({i, id: x.id, v, pre: x.id === 'custom_size' ? {size: 'custom'} : {}});
    } });
    for (const c of cases) {
      const tag = (c.i == null ? '' : base[c.i].type + '.') + c.id + '=' + JSON.stringify(c.v).slice(0, 24) + '@' + width;
      if (width === 375 && c.id === 'max_width' && c.v === 'full') continue; /* phone: Medium (640px) is already the full column */
      const bl = extra => base.map((b, i) => i === c.i ? {type: b.type, settings: {...b.settings, ...(c.pre || {}), ...extra}} : b);
      await L.redraw({settings: RESET, blocks: bl({})}); await frames(L.page); await L.page.waitForTimeout(80);
      const before = await sig(L.page);
      await R.redraw({settings: c.i == null ? {...RESET, [c.id]: c.v} : RESET, blocks: bl(c.i == null ? {} : {[c.id]: c.v})}); await frames(R.page); await R.page.waitForTimeout(80);
      const redrawn = await sig(R.page);
      if (!diff(before, redrawn).length) fails.push(tag + ': no visible change after a redraw');
      if (c.i == null) await L.emit({[c.id]: c.v}); else await L.emit({[c.id]: c.v}, L.rendered[0].section.blocks[c.i].id);
      await frames(L.page); await L.page.waitForTimeout(150);
      const d = diff(await sig(L.page), redrawn);
      if (d.length) fails.push(tag + ': live differs from redraw: ' + d.slice(0, 4).join(' | '));
      checks++;
    }
    eq(L.errors.concat(R.errors), [], 'no errors with blocks');
    await L.page.close(); await R.page.close();
  }
  if (fails.length) console.log(fails.join('\n'));
  eq(fails, [], 'every block setting live and after a redraw');
}

async function saved(browser) {
  const newRaw = fs.readFileSync(path.join(ROOT, 'sections/blog-posts.storelib'), 'utf8'), controls = await themeControls();
  /* The blog page's instance was made again in the builder with the creator's
     Subheading, Heading and Text blocks (Storelib AI's redesign, 0674ef4), so
     it is compared with that commit; the article page's with BEFORE. */
  for (const [tpl, key, ref] of [['blog', 'blog-posts-1793646112970', '0674ef4'], ['article', 'blog_posts_bRcpan', BEFORE]]) {
    let oldRaw; try { oldRaw = execSync('git show ' + ref + ':sections/blog-posts.storelib', {cwd: ROOT, encoding: 'utf8'}); } catch (_) { continue; }
    const sec = JSON.parse(fs.readFileSync(path.join(ROOT, 'templates', tpl + '.json'), 'utf8')).sections[key];
    const fill = (raw, toggles) => { const s = JSON.parse(raw.split('<schema>')[1].split('</schema>')[0]).shopify, d = l => Object.fromEntries((l || []).filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
      const blocks = (sec.block_order || []).map(id => ({id, type: sec.blocks[id].type, shopify_attributes: '', settings: {...d((s.blocks || []).find(x => x.type === sec.blocks[id].type)?.settings), ...sec.blocks[id].settings}}));
      return {id: 'S', settings: {...d(s.settings), ...sec.settings, ...(toggles ? {enable_custom_style: true} : {})}, blocks}; };
    /* the saved blog by its handle: posts in Liquid as the old file read them (blogs[handle]) */
    const globals = sec.settings.blog ? {blogs: {[sec.settings.blog]: {...BLOG, handle: sec.settings.blog, url: '/blogs/' + sec.settings.blog}}} : {blogs: {}, blog: BLOG} /* no blog picked: the blog being read */;
    const html = async (raw, toggles) => { const e = engine(); e.registerFilter('script_tag', () => ''); const ctx = {section: fill(raw, toggles), settings: {scroll_animation: 'none'}, request: {design_mode: false}, ...globals}; return (await e.parseAndRender(raw.split('<schema>')[0].replace(/^<template compat="shopify">/, '').replace(/<\/template>\s*$/, ''), ctx, {globals: ctx})).replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<link\b[^>]*>/g, ''); };
    for (const width of [375, 1366]) {
      const look = async (h, js) => {
        const page = await browser.newPage({viewport: {width, height: 900}});
        await page.route('**/*', r => r.request().url() === 'http://theme.test/' ? r.fulfill({body: '<!doctype html><html><head></head><body></body></html>', contentType: 'text/html'}) : r.fulfill({body: ''}));
        await page.goto('http://theme.test/');
        await page.addStyleTag({content: controls}); await page.addStyleTag({content: THEME_VARS});
        for (const f of ['critical.css', 'theme.css', 'theme-button-contract.css', 'swiper-bundle.min.css']) await page.addStyleTag({content: fs.readFileSync(path.join(ROOT, 'shopify/assets', f), 'utf8')});
        await page.evaluate(h => { const w = document.createElement('div'); w.id = 'shopify-section-S'; w.className = 'shopify-section'; w.innerHTML = h; document.body.append(w); }, h);
        for (const f of ['swiper-bundle.min.js', 'motion.min.js', 'global.js', ...js]) await page.addScriptTag({content: fs.readFileSync(path.join(ROOT, 'shopify/assets', f), 'utf8')});
        await page.waitForTimeout(400);
        const r = await page.evaluate(() => {
          const W = document.getElementById('shopify-section-S'), cs = (el, p) => el ? p.map(k => getComputedStyle(el)[k]) : null, h = W.querySelector('h2'), v = W.querySelector('.btn_view-all');
          return {root: cs(W.querySelector('.section'), ['backgroundColor', 'paddingTop']), h: [h.textContent.trim(), ...cs(h, ['color', 'fontSize', 'fontWeight', 'textAlign']), Math.round(h.getBoundingClientRect().top), Math.round(h.getBoundingClientRect().height)],
            sub: W.querySelector('.section__header-sub') && [W.querySelector('.section__header-sub').textContent.trim(), ...cs(W.querySelector('.section__header-sub'), ['color', 'fontSize', 'fontWeight', 'textTransform', 'letterSpacing'])],
            des: W.querySelector('.section__header-des') && [W.querySelector('.section__header-des').textContent.trim(), ...cs(W.querySelector('.section__header-des'), ['color', 'fontSize'])],
            v: v && [v.textContent.trim(), ...cs(v, ['backgroundColor', 'color', 'borderTopLeftRadius', 'paddingLeft']), Math.round(v.getBoundingClientRect().left)],
            cards: [...W.querySelectorAll('.swiper-slide')].slice(0, 3).map(s => { const r = s.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.width), Math.round(r.height), s.querySelector('.blog-posts-title')?.textContent.trim()]; }),
            title: cs(W.querySelector('.blog-posts-title a'), ['color', 'fontFamily', 'fontSize']), meta: [!!W.querySelector('.blog-posts-author'), !!W.querySelector('.blog-posts-date')], dots: !!W.querySelector('.swiper-pagination-bullet')};
        });
        await page.close(); return r;
      };
      const before = await look(await html(oldRaw, false), []), after = await look(await html(newRaw, true), ['live-blog-slideshow.js']);
      eq(diff(before, after), [], 'saved ' + tpl + ' at ' + width + ' looks as it did (enable_custom_style on)');
    }
  }
}

(async () => {
  eq(schemaProblems('blog-posts'), [], 'schema problems');
  const s = schemaOf('blog-posts').schema;
  let head = null; try { head = JSON.parse(execSync('git show ' + BEFORE + ':sections/blog-posts.storelib', {cwd: ROOT, encoding: 'utf8'}).split('<schema>')[1].split('</schema>')[0]).shopify; } catch (_) {}
  if (head) for (const id of head.settings.filter(x => x.id).map(x => x.id)) ok(s.settings.some(x => x.id === id), 'kept ' + id);
  eq(s.settings.filter(x => x.type === 'header').map(x => x.content), ['General', 'Content', 'Layout', 'Carousel', 'Media', 'Appearance', 'Typography', 'Animation', 'Desktop spacing', 'Mobile'], 'groups in the shared order');
  const browser = await launch();
  try {
    if (!only.length || only.includes('content')) await content(browser);
    if (!only.length || only.includes('theme')) await themeFirst(browser);
    if (!only.length || only.includes('life')) await lifecycle(browser);
    if (!only.length || only.includes('saved')) await saved(browser);
    if (!only.length || only.includes('blocks')) await blocks(browser);
    if (!only.length || !['content', 'theme', 'life', 'saved', 'blocks'].includes(only[0])) await controls(browser);
  } finally { await browser.close(); }
  console.log(checks + ' blog posts round 5 checks passed');
})().catch(e => { console.error(e); process.exit(1); });
