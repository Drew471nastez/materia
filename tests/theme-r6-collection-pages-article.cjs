/* Round 6, the blog post page (sections/main-article.storelib,
   templates/article.json) with the real theme priority rules and
   shopify/assets/live-collection-pages.js.

   1. Schema: every id at c098384 kept, the shared group order, plain labels.
   2. No post (Storelib has none yet): the storefront shows the section's note
      and a theme button back to the blog, one h1, no empty "Written by" or
      date; the builder shows each block as a quiet outline (no made-up title,
      author or date) so its settings can still be seen and changed.
   3. With a post: every visible section and block setting at 375 and 1366
      (redraw differs, live equals redraw, old value restores).
   4. Theme first; block colours wait for Enable custom styling; custom fonts
      win over the theme priority rules (data-own-font) on the element and a
      paragraph inside; off restores the theme.
   5. First paint equals the hydrated paint; two instances independent.
   6. The saved instance looks as it did, with the category and author and
      date blocks' enable_custom_style on.

   LIQUIDJS=<path to liquidjs> node tests/theme-r6-collection-pages-article.cjs [content|theme|life|saved|sweep|empty] */
const L = require('./theme-r6-collection-pages-lib.cjs');
const {ok, eq, frames, settle, counter} = L;
const NAME = 'main-article';
const only = process.argv.slice(2);
const BLOG = {title: 'News', handle: 'news', url: '/blogs/news'};
const POST = {id: 1, title: 'Planting the spring beds', handle: 'news/planting', url: '/blogs/news/planting', author: 'Ana Ruiz', published_at: '2026-03-02', content: '<p>First paragraph of the post.</p><p>Second paragraph.</p>', excerpt: '', image: {url: 'https://theme.test/a.png', src: 'https://theme.test/a.png', width: 1600, height: 900, aspect_ratio: 1.78, alt: 'Beds'}};
const WITH = {template: 'article', blog: BLOG, article: POST};
const NONE = {template: 'article', blog: BLOG};
const BLOCKS = ['category', 'title', 'blog_meta', 'featured_image', 'content_article', 'author_highlight'].map(type => ({type, settings: {}}));

const sig = page => page.evaluate(() => {
  const R = document.querySelector('#shopify-section-test [data-lcp]');
  if (!R) return null;
  const cs = (el, p) => el ? Object.fromEntries(p.map(k => [k, getComputedStyle(el)[k]])) : null;
  const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.width), Math.round(b.height)]; };
  const vis = el => el && !el.hidden && getComputedStyle(el).display !== 'none' ? el : null;
  const e = R.querySelector('[data-ma-empty]');
  return {
    cls: [...R.classList].sort().join(' '), inner: R.firstElementChild.className, root: cs(R, ['backgroundColor', 'paddingTop', 'paddingBottom']),
    title: cs(R.querySelector('.article-template__title'), ['fontSize', 'fontFamily']), pill: cs(R.querySelector('.article-category-pill'), ['backgroundColor', 'borderTopLeftRadius']),
    meta: cs(R.querySelector('.blog-meta-pill'), ['backgroundColor', 'borderTopLeftRadius']), date: cs(R.querySelector('.date-pill'), ['backgroundColor']),
    hero: r(R.querySelector('[data-ma-hero]')), heroR: cs(R.querySelector('[data-ma-hero]'), ['borderTopLeftRadius']), heroBox: cs(R.querySelector('[data-ma-hero]')?.parentElement, ['paddingTop', 'paddingBottom']),
    content: r(R.querySelector('.article-template__content')), cfont: cs(R.querySelector('.article-template__content p'), ['fontFamily']),
    author: r(R.querySelector('.author-highlight')), photo: r(R.querySelector('.author-highlight__image')), note: R.querySelector('[data-ma-author-text]')?.textContent.trim(),
    empty: e && {h: vis(e.querySelector('h1'))?.textContent.trim(), p: vis(e.querySelector('.ma-empty__text'))?.innerHTML.trim(), a: vis(e.querySelector('a')) && [e.querySelector('a').textContent.trim(), e.querySelector('a').getAttribute('href')]},
  };
});

async function content(browser) {
  const store = await L.render(NAME, {editing: false, blocks: BLOCKS, globals: NONE});
  ok(/data-ma-empty/.test(store.html) && /This post is not available/.test(store.html) && /href="\/blogs\/news"[^>]*data-theme-button="primary"/.test(store.html), 'storefront, no post: the note and a button back to the blog');
  ok(!/Written by|Post by|article-template__title/.test(store.html.replace(/<style[\s\S]*?<\/style>/g, '')), 'storefront, no post: no empty byline or title');
  eq((store.html.match(/<h1\b/g) || []).length, 1, 'storefront, no post: one h1');
  const ed = await L.render(NAME, {editing: true, blocks: BLOCKS, globals: NONE});
  ok(/ma-skeleton/.test(ed.html) && !/Written by|Post by/.test(ed.html), 'builder, no post: outlines, no made-up byline');
  const real = await L.render(NAME, {editing: false, blocks: BLOCKS, globals: WITH});
  ok(/Planting the spring beds/.test(real.html) && /Written by <strong>Ana Ruiz/.test(real.html) && !/ma-skeleton|data-ma-empty/.test(real.html.replace(/<style[\s\S]*?<\/style>/g, '')), 'with a post: the post, no outlines');
  for (const width of [375, 1366]) for (const [label, globals, editing] of [['none-store', NONE, false], ['none-builder', NONE, true], ['post', WITH, false]]) {
    const t = await L.mount(browser, NAME, {width, editing, blocks: BLOCKS, assets: [L.CTRL], globals});
    ok(await t.noOverflow(), 'no sideways scroll ' + label + ' ' + width);
    if (label === 'none-store') ok((await t.root('.ma-empty__action').boundingBox()).height >= 44, '44px button ' + width);
    await t.page.screenshot({path: require('path').join(process.env.SHOTS || require('os').tmpdir(), 'r6-main-article-' + label + '-' + width + '.png'), fullPage: true});
    eq(t.errors, [], 'no errors ' + label + ' ' + width);
    await t.page.close();
  }
}

async function themeFirst(browser) {
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const t = await L.mount(browser, NAME, {width, editing, assets: [L.CTRL], blocks: BLOCKS, globals: WITH});
    const read = async () => (await settle(t.page), {bg: await t.css('[data-lcp]', 'backgroundColor'), tf: await t.css('.article-template__title', 'fontFamily'), cp: await t.css('.article-template__content p', 'fontFamily'), pill: await t.css('.article-category-pill', 'backgroundColor'), meta: await t.css('.blog-meta-pill', 'backgroundColor'), date: await t.css('.date-pill', 'backgroundColor')});
    const theme = await read();
    eq([theme.bg, theme.tf, theme.cp], ['rgb(24, 32, 40)', 'Georgia', 'Arial'], 'theme first ' + width);
    const ids = Object.fromEntries(['title', 'category', 'blog_meta', 'content_article'].map(k => [k, t.blockId(k)]));
    const on = {title: {enable_custom_fonts: true, font: L.FONT}, content_article: {enable_custom_fonts: true, font: L.MONO}, category: {enable_custom_style: true, category_background_color: '#ee1122'}, blog_meta: {enable_custom_style: true, blog_meta_background_color: '#11ee22', date_pill_background_color: '#2233ee'}};
    const off = {title: {enable_custom_fonts: false}, content_article: {enable_custom_fonts: false}, category: {enable_custom_style: false}, blog_meta: {enable_custom_style: false}};
    const want = async label => { const r = await read(); ok(/Verdana/.test(r.tf) && /Courier New/.test(r.cp), label + ' fonts'); eq([r.pill, r.meta, r.date], ['rgb(238, 17, 34)', 'rgb(17, 238, 34)', 'rgb(34, 51, 238)'], label + ' colours'); };
    const back = async label => { eq(await read(), theme, label + ' restored'); eq(await t.page.locator('#shopify-section-test [data-own-font]').count(), 0, label + ' attributes gone'); };
    for (const k in on) await t.emit(on[k], ids[k]); await frames(t.page); await want('live on ' + width);
    for (const k in off) await t.emit(off[k], ids[k]); await frames(t.page); await back('live off ' + width);
    await t.redraw({blocks: BLOCKS.map(b => ({type: b.type, settings: {...(on[b.type] || {}), ...(b.type === 'category' ? {} : {})}}))}); await frames(t.page); await want('redraw on ' + width);
    await t.redraw({blocks: BLOCKS.map(b => ({type: b.type, settings: {...(on[b.type] || {}), ...(off[b.type] || {})}}))}); await frames(t.page); await back('redraw off ' + width);
    await t.emit({color_scheme: 'alt-scheme'}); await frames(t.page);
    eq(await t.css('[data-lcp]', 'backgroundColor'), 'rgb(250, 250, 250)', 'scheme live ' + width);
    eq(t.errors, [], 'no errors ' + width);
    await t.page.close();
  }
}

const look = page => page.evaluate(() => {
  const R = document.querySelector('#shopify-section-S .sec__article');
  const cs = (el, p) => el ? p.map(k => getComputedStyle(el)[k]) : null, r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
  return {root: cs(R, ['backgroundColor', 'paddingTop', 'paddingBottom']), title: [R.querySelector('h1')?.textContent.trim(), ...cs(R.querySelector('h1'), ['fontSize', 'fontFamily', 'color']), ...r(R.querySelector('h1'))],
    pill: [...cs(R.querySelector('.article-category-pill'), ['backgroundColor', 'borderTopLeftRadius', 'color']), ...r(R.querySelector('.article-category-pill'))], meta: [...cs(R.querySelector('.blog-meta-pill'), ['backgroundColor', 'borderTopLeftRadius', 'paddingTop']), ...r(R.querySelector('.blog-meta-pill'))],
    date: cs(R.querySelector('.date-pill'), ['backgroundColor', 'paddingLeft']), hero: [...cs(R.querySelector('.media'), ['borderTopLeftRadius']), ...r(R.querySelector('.media'))], content: r(R.querySelector('.article-template__content')), author: [R.querySelector('.author-highlight')?.textContent.replace(/\s+/g, ' ').trim(), ...r(R.querySelector('.author-highlight')), ...r(R.querySelector('.author-highlight__image'))]};
});

(async () => {
  L.schemaChecks(NAME, ['General', 'Content', 'Layout', 'Desktop spacing']);
  const browser = await L.launch();
  try {
    if (!only.length || only.includes('content')) await content(browser);
    if (!only.length || only.includes('theme')) await themeFirst(browser);
    if (!only.length || only.includes('life')) {
      for (const [blocks, globals, settings] of [[BLOCKS, WITH, {}], [BLOCKS, NONE, {}], [BLOCKS.map(b => ({type: b.type, settings: {enable_custom_fonts: true, font: L.FONT, enable_custom_style: true, category_background_color: '#ee1122', image_height: 'small'}})), WITH, {content_width_desktop: 700}]])
        await L.firstPaint(browser, NAME, {blocks, globals, settings, sig});
      await L.twoInstances(browser, NAME, {blocks: BLOCKS, globals: WITH, blockType: 'title', edit: {blog_title_font_size: 61}, read: (t, uid) => t.page.evaluate(uid => getComputedStyle(document.querySelector('#shopify-section-' + uid + ' h1')).fontSize, uid)});
    }
    if (!only.length || only.includes('saved')) {
      const sec = JSON.parse(L.read('templates/article.json')).sections.main;
      const blocks = (sec.block_order || Object.keys(sec.blocks)).map(k => sec.blocks[k]);
      await L.saved(browser, NAME, {inst: {settings: sec.settings, blocks, blockToggles: {category: {enable_custom_style: true}, blog_meta: {enable_custom_style: true}}}, globals: WITH, look, label: 'templates/article.json main (a post)'});
    }
    if (!only.length || only.includes('sweep')) await L.sweep(browser, NAME, {blocks: BLOCKS, globals: WITH, sig, assets: ['blog.css', L.CTRL],
      skip: new Set(['empty_heading', 'empty_text', 'empty_button_label', 'empty_button_url', 'author_highlight.author_image']),
      pre: {'category.category_background_color': {block: {enable_custom_style: true}}, 'blog_meta.blog_meta_background_color': {block: {enable_custom_style: true}}, 'blog_meta.date_pill_background_color': {block: {enable_custom_style: true}},
        'title.font': {block: {enable_custom_fonts: true, font: L.MONO}}, 'title.enable_custom_fonts': {block: {font: L.MONO}}, 'content_article.font': {block: {enable_custom_fonts: true, font: L.MONO}}, 'content_article.enable_custom_fonts': {block: {font: L.MONO}}},
      structural: new Set(['reset_spacing']),
      same: {all: new Set(['category.enable_custom_style', 'blog_meta.enable_custom_style', 'section_width:stretch_width', 'reset_spacing']), 375: new Set(['content_width_desktop', 'author_margin_left', 'author_margin_right', 'featured_image.image_height'])}, lenientSame: true});
    if (!only.length || only.includes('empty')) await L.sweep(browser, NAME, {blocks: BLOCKS, globals: NONE, editing: false, sig, only: ['empty_heading', 'empty_text', 'empty_button_label', 'empty_button_url', 'color_scheme'],
      values: {empty_heading: ['Edited words', ''], empty_text: ['<p>Edited <em>text</em></p>', ''], empty_button_label: ['Edited words', '']}});
  } finally { await browser.close(); }
  console.log(counter.checks + ' blog post page round 6 checks passed');
})().catch(e => { console.error(e); process.exit(1); });
