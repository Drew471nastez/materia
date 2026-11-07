/* Round 6, the blog page (sections/main-blog.storelib, templates/blog.json)
   with the real theme priority rules and shopify/assets/live-collection-pages.js.

   1. Schema: every id at c098384 kept, the shared group order, plain labels.
   2. No posts (a Storelib blog draws its title and no posts): a short note in
      the creator's words and one theme button, in the builder and on the
      storefront; no made-up post, no lorem ipsum, no "We can't find posts".
      Its words, link and alignment are live.
   3. Real posts (a store with a blog): every visible setting at 375 and 1366
      looks different after a redraw, the same change sent live looks like the
      redraw, the old value restores it. The badge goes on the named post.
   4. Theme first; badge colours wait for Enable custom styling; custom fonts
      win over the theme's priority rules (data-own-font) on the titles and
      text; off restores the theme.
   5. First paint equals the hydrated paint; two instances independent.
   6. The saved instance (templates/blog.json main) looks as it did, with
      enable_custom_style on (its badge colours), with posts and without.
      Since the creator's builder redesign (0674ef4, cards drawn by the
      section itself as .mb-card) the look is compared with that commit.

   LIQUIDJS=<path to liquidjs> node tests/theme-r6-collection-pages-blog.cjs [content|theme|life|saved|sweep|empty] */
const L = require('./theme-r6-collection-pages-lib.cjs');
const {ok, eq, frames, settle, counter} = L;
const NAME = 'main-blog';
const only = process.argv.slice(2);
const post = i => ({id: 100 + i, title: 'Post number ' + i, handle: 'news/post-' + i, url: '/blogs/news/post-' + i, author: 'Writer ' + i, published_at: '2026-0' + i + '-02', content: '<p>Body of post ' + i + ' with enough words to read.</p>', tags: ['Studio'], image: {url: 'https://theme.test/p' + i + '.png', src: 'https://theme.test/p' + i + '.png', width: 1200, height: 800, aspect_ratio: 1.5, alt: 'Picture ' + i}});
const BLOG = {id: 7, title: 'News', handle: 'news', url: '/blogs/news', articles: [1, 2, 3, 4, 5].map(post), articles_count: 5};
const POSTS = {template: 'blog', blog: BLOG, blogs: {news: BLOG}};
const NONE = {template: 'blog', blog: {title: 'Blog', handle: 'blog', url: '/blogs/blog', articles: [], articles_count: 0}, blogs: {}};
const BASE = {blog_select: 'news', blog_post_badge_reference: 'news/post-2', items_to_show: 5};

const sig = page => page.evaluate(() => {
  const R = document.querySelector('#shopify-section-test [data-lcp]');
  if (!R) return null;
  const cs = (el, p) => el ? Object.fromEntries(p.map(k => [k, getComputedStyle(el)[k]])) : null;
  const vis = el => el && !el.hidden && getComputedStyle(el).display !== 'none' ? el : null;
  const grid = R.querySelector('#blog-articles'), cards = [...R.querySelectorAll('.mb-card')], badge = R.querySelector('.mb-badge'), btn = R.querySelector('a.mb-btn');
  const e = R.querySelector('[data-main-blog-empty]');
  return {
    cls: [...R.classList].sort().join(' '), inner: R.firstElementChild.className, root: cs(R, ['backgroundColor', 'marginTop', 'marginBottom', 'paddingTop', 'paddingBottom']),
    own: R.hasAttribute('data-own-font'), grid: grid && [...grid.classList].sort().join(' '),
    cols: grid && [...new Set(cards.map(c => Math.round(c.getBoundingClientRect().top)))].length, w: cards[0] && Math.round(cards[0].getBoundingClientRect().width), x2: cards[1] && Math.round(cards[1].getBoundingClientRect().left),
    tops: cards.map(c => Math.round(c.getBoundingClientRect().top)), anim: cards[0] && getComputedStyle(cards[0]).animationName,
    img: cs(R.querySelector('.mb-card__media'), ['aspectRatio', 'borderTopLeftRadius']) && [getComputedStyle(R.querySelector('.mb-card__media')).aspectRatio, Math.round(R.querySelector('.mb-card__media').getBoundingClientRect().height), getComputedStyle(R.querySelector('.mb-card__media')).borderTopLeftRadius],
    title: cs(R.querySelector('.mb-card__title a'), ['fontFamily', 'color', 'fontSize']), text: cs(R.querySelector('.mb-card__excerpt'), ['fontFamily', 'color', 'webkitLineClamp']),
    meta: cs(R.querySelector('.mb-card__meta'), ['color']), metaText: R.querySelector('.mb-card__meta')?.textContent.trim(),
    info: cs(R.querySelector('.mb-card'), ['textAlign']), bottom: cs(R.querySelector('.mb-card__body'), ['alignItems']),
    more: btn && [btn.className.replace(/\s+/g, ' ').trim(), btn.getAttribute('data-theme-button'), btn.textContent.trim(), btn.getAttribute('aria-label'), !!vis(btn.querySelector('.mb-btn__arrow')), ...Object.values(cs(btn, ['color', 'backgroundColor', 'borderTopLeftRadius', 'minHeight', 'width']))],
    hover: btn && ['--mb-hover-bg', '--mb-hover-text', '--mb-hover-border', '--mbl-link-hover'].map(p => getComputedStyle(btn).getPropertyValue(p).trim()),
    date: !!R.querySelector('.mb-card__date'), excerpt: !!R.querySelector('.mb-card__excerpt'),
    badge: badge && {t: badge.textContent.trim(), shown: !!vis(badge), at: badge.closest('.mb-card').textContent.includes('Post number 2'), ...cs(badge, ['backgroundColor', 'color', 'top', 'left', 'minWidth', 'height', 'fontSize', 'borderTopLeftRadius'])},
    empty: e && {align: cs(e, ['alignItems', 'textAlign']), h: vis(e.querySelector('h2')) && [e.querySelector('h2').textContent.trim(), getComputedStyle(e.querySelector('h2')).fontFamily], p: vis(e.querySelector('.main-blog-empty__text')) && [e.querySelector('.main-blog-empty__text').innerHTML.trim(), getComputedStyle(e.querySelector('.main-blog-empty__text p') || e).fontFamily], a: vis(e.querySelector('a')) && [e.querySelector('a').textContent.trim(), e.querySelector('a').getAttribute('href'), getComputedStyle(e.querySelector('a')).backgroundColor]},
  };
});

async function content(browser) {
  for (const editing of [true, false]) {
    const r = await L.render(NAME, {editing, settings: {}, globals: NONE});
    ok(/data-main-blog-empty/.test(r.html) && /No posts yet/.test(r.html) && /href="\/collections\/all"[^>]*data-theme-button="primary"/.test(r.html), 'no posts: the note and a theme button ' + (editing ? 'editor' : 'storefront'));
    ok(!/class="mb-card"|blog-posts-item|Lorem|ipsum|We can&#39;t find|We can't find/.test(r.html), 'no posts: nothing made up, no old message');
  }
  const r = await L.render(NAME, {editing: false, settings: BASE, globals: POSTS});
  eq([...r.html.matchAll(/class="mb-card__title"><a [^>]*><span>([^<]*)<\/span>/g)].map(m => m[1]).join('|'), 'Post number 1|Post number 2|Post number 3|Post number 4|Post number 5', 'the blog\'s own posts');
  ok(!/data-main-blog-empty/.test(r.html), 'posts: no empty note');
  const c = await L.render(NAME, {editing: false, settings: {...BASE, blog_select: ''}, globals: POSTS});
  ok(/Post number 1/.test(c.html), 'no blog picked: the blog being read');
  const J = {...BLOG, id: 8, title: 'Journal', handle: 'journal', url: '/blogs/journal', articles: [post(9)], articles_count: 1};
  const j = await L.render(NAME, {editing: false, settings: {...BASE, blog_select: 'journal'}, globals: {...POSTS, blogs: {news: BLOG, journal: J}}});
  ok(/Post number 9/.test(j.html) && !/Post number 1</.test(j.html), 'a typed blog handle: that blog\'s posts');
  for (const width of [375, 1366]) {
    const t = await L.mount(browser, NAME, {width, assets: [L.CTRL], globals: NONE});
    const box = await t.root('.main-blog-empty__action').boundingBox();
    ok(box.height >= 44, 'empty button 44px tall ' + width);
    ok(await t.noOverflow(), 'no sideways scroll ' + width);
    await t.page.screenshot({path: require('path').join(process.env.SHOTS || require('os').tmpdir(), 'r6-main-blog-empty-' + width + '.png')});
    await t.page.close();
  }
}

async function themeFirst(browser) {
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const t = await L.mount(browser, NAME, {width, editing, assets: [L.CTRL], settings: BASE, globals: POSTS});
    const read = async () => (await settle(t.page), {bg: await t.css('[data-lcp]', 'backgroundColor'), tf: await t.css('.mb-card__title a', 'fontFamily'), tc: await t.css('.mb-card__excerpt', 'fontFamily'), bb: await t.css('.mb-badge', 'backgroundColor'), bt: await t.css('.mb-badge', 'color')});
    const theme = await read();
    eq([theme.bg, theme.tf, theme.tc, theme.bb, theme.bt], ['rgb(24, 32, 40)', 'Georgia', 'Arial', 'rgb(51, 102, 153)', 'rgb(255, 255, 255)'], 'theme first ' + width);
    await t.redraw({settings: {...BASE, badge_background_color: '#ff0000'}}); await frames(t.page);
    eq(await read(), theme, 'badge colour waits for Enable custom styling ' + width);
    const ON = {enable_custom_style: true, badge_background_color: '#ee1122', badge_text_color: '#11ee22', enable_custom_fonts: true, heading_font: L.FONT, body_font: L.MONO};
    const want = async label => { const r = await read(); ok(/Verdana/.test(r.tf) && /Courier New/.test(r.tc), label + ' fonts ' + JSON.stringify(r)); eq([r.bb, r.bt], ['rgb(238, 17, 34)', 'rgb(17, 238, 34)'], label + ' badge'); };
    const back = async label => { eq(await read(), theme, label + ' restored'); eq(await t.page.locator('#shopify-section-test [data-own-font]').count(), 0, label + ' attribute gone'); };
    await t.emit(ON); await frames(t.page); await want('live on ' + width);
    await t.emit({enable_custom_style: false, enable_custom_fonts: false}); await frames(t.page); await back('live off ' + width);
    await t.redraw({settings: {...BASE, ...ON}}); await frames(t.page); await want('redraw on ' + width);
    await t.redraw({settings: {...BASE, enable_custom_style: false, enable_custom_fonts: false}}); await frames(t.page); await back('redraw off ' + width);
    await t.emit({color_scheme: 'alt-scheme'}); await frames(t.page);
    eq(await t.css('[data-lcp]', 'backgroundColor'), 'rgb(250, 250, 250)', 'scheme live ' + width);
    ok(await t.noOverflow(), 'no sideways scroll ' + width);
    eq(t.errors, [], 'no errors ' + width);
    await t.page.close();
  }
}

const look = page => page.evaluate(() => {
  const W = document.getElementById('shopify-section-S'), R = W.querySelector('.sec__blog-list');
  const cs = (el, p) => el ? p.map(k => getComputedStyle(el)[k]) : null, r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
  const badge = R.querySelector('.mb-badge');
  return {root: [...cs(R, ['backgroundColor', 'marginTop', 'paddingTop'])], cards: [...R.querySelectorAll('.mb-card')].map(c => [...r(c), c.querySelector('.mb-card__title')?.textContent.trim()]),
    title: cs(R.querySelector('.mb-card__title a'), ['color', 'fontFamily', 'fontSize']), more: cs(R.querySelector('a.mb-btn'), ['color', 'fontSize']),
    badge: badge && [badge.textContent.trim(), ...cs(badge, ['backgroundColor', 'color', 'borderTopLeftRadius', 'fontSize']), ...r(badge)]};
});

(async () => {
  L.schemaChecks(NAME, ['General', 'Content', 'Layout', 'Media', 'Badge', 'Appearance', 'Buttons', 'Typography', 'Animation', 'Desktop spacing', 'Mobile']);
  const browser = await L.launch();
  try {
    if (!only.length || only.includes('content')) await content(browser);
    if (!only.length || only.includes('theme')) await themeFirst(browser);
    if (!only.length || only.includes('life')) {
      for (const [settings, globals] of [[BASE, POSTS], [{...BASE, enable_custom_style: true, badge_background_color: '#ee1122', enable_custom_fonts: true, heading_font: L.FONT, body_font: L.MONO, content_alignment: 'right', image_ratio: 'portrait'}, POSTS], [{}, NONE], [{content_alignment: 'left', enable_custom_fonts: true, heading_font: L.FONT}, NONE]])
        await L.firstPaint(browser, NAME, {settings, globals, sig});
      await L.twoInstances(browser, NAME, {settings: BASE, globals: POSTS, edit: {items_per_row: 2, badge_text: 'Only b'}, read: (t, uid) => t.page.evaluate(uid => { const R = document.querySelector('#shopify-section-' + uid); return [R.querySelector('.mb-badge').textContent.trim(), Math.round(R.querySelector('.mb-card').getBoundingClientRect().width)]; }, uid)});
    }
    if (!only.length || only.includes('saved')) {
      const sec = JSON.parse(L.read('templates/blog.json')).sections.main;
      const BL = {...BLOG, handle: sec.settings.blog_select, url: '/blogs/' + sec.settings.blog_select, articles: BLOG.articles.map((a, i) => i === 1 ? {...a, handle: sec.settings.blog_post_badge_reference.split('/').pop()} : a)}; /* the bare post handle, which 0674ef4 matches against the last part of the setting */
      await L.saved(browser, NAME, {inst: {settings: sec.settings, toggles: {enable_custom_style: true}}, globals: {template: 'blog', blog: BL, blogs: {[sec.settings.blog_select]: BL}}, look, ref: '0674ef4', label: 'templates/blog.json main (posts)'});
    }
    if (!only.length || only.includes('sweep')) await L.sweep(browser, NAME, {base: BASE, globals: POSTS, sig,
      skip: new Set(['empty_heading', 'empty_text', 'empty_button_label', 'empty_button_url']),
      pre: {badge_background_color: {enable_custom_style: true}, badge_text_color: {enable_custom_style: true}, heading_font: {enable_custom_fonts: true, heading_font: L.MONO, body_font: L.MONO}, body_font: {enable_custom_fonts: true, heading_font: L.MONO, body_font: L.MONO}, enable_custom_fonts: {heading_font: L.FONT, body_font: L.MONO}, custom_ratio: {image_ratio: 'custom'}, margin_top: {reset_spacing: false}, margin_bottom: {reset_spacing: false}, readmore_type: {show_readmore: true},
        title_color: {enable_custom_style: true}, meta_color: {enable_custom_style: true}, excerpt_color: {enable_custom_style: true},
        button_custom_colors: {enable_custom_style: true, button_bg: '#123456', button_text: '#fedcba'},
        button_bg: {enable_custom_style: true, button_custom_colors: true}, button_text: {enable_custom_style: true, button_custom_colors: true}, button_hover_bg: {enable_custom_style: true, button_custom_colors: true}, button_hover_text: {enable_custom_style: true, button_custom_colors: true, readmore_type: 'secondary'},
        readmore_line: {readmore_type: 'underline'}},
      values: {custom_ratio: ['2:1'], blog_select: [''], blog_post_badge_reference: ['news/post-3']},
      structural: new Set(['reset_spacing', 'blog_select', 'show_category', 'show_date', 'show_excerpt', 'show_readmore', 'layout', 'items_to_show', 'pagination', 'button_show_more', 'image_ratio:adapt', 'blog_post_badge_reference']),
      same: {all: new Set(['enable_custom_style', 'blog_select', 'button_show_more', 'pagination', 'reset_spacing', 'items_to_show', 'section_width:stretch_width']), 375: new Set(['items_per_row', 'column_gap', 'layout', 'section_width:container', 'section_width:fluid_container', 'section_width:full_width', 'padding_top', 'padding_bottom']), 1366: new Set(['items_per_row_mobile', 'padding_top_mobile', 'padding_bottom_mobile'])}, lenientSame: true});
    if (!only.length || only.includes('empty')) await L.sweep(browser, NAME, {globals: NONE, sig, only: ['empty_heading', 'empty_text', 'empty_button_label', 'empty_button_url', 'content_alignment', 'color_scheme', 'enable_custom_fonts', 'heading_font', 'body_font'],
      pre: {heading_font: {enable_custom_fonts: true, heading_font: L.MONO, body_font: L.MONO}, body_font: {enable_custom_fonts: true, heading_font: L.MONO, body_font: L.MONO}, enable_custom_fonts: {heading_font: L.FONT, body_font: L.MONO}},
      values: {empty_heading: ['Edited words', ''], empty_text: ['<p>Edited <em>text</em></p>', ''], empty_button_label: ['Edited words', '']}});
  } finally { await browser.close(); }
  console.log(counter.checks + ' blog page round 6 checks passed');
})().catch(e => { console.error(e); process.exit(1); });
