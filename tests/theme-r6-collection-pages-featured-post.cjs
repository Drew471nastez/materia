/* Round 6, Featured post banner (sections/featured-blog-header.storelib,
   templates/blog.json) with the real theme priority rules and
   shopify/assets/live-collection-pages.js.

   1. Schema: every id at c098384 kept, the shared group order, plain labels.
   2. No post picked or published (Storelib has no posts yet): nothing on the
      storefront; the builder shows the picture area, the label, the button
      and quiet bars where the title and text go, with no made-up title, no
      lorem ipsum. The section title is an h2.
   3. With a post: every visible setting at 375 and 1366 (redraw differs, live
      equals redraw, old value restores).
   4. Theme first: scheme background, theme fonts and the theme button; the
      colours wait for Enable custom styling; "Use theme fonts" off wins over
      the theme priority rules (data-own-font / data-own-weight) and on
      restores them; "Use theme button shape" off sets data-own-shape.
   5. First paint equals the hydrated paint; no reveal hiding in the builder
      or under reduced motion; two instances independent.
   6. The saved instance looks as it did, with enable_custom_style on.

   LIQUIDJS=<path to liquidjs> node tests/theme-r6-collection-pages-featured-post.cjs [content|theme|life|saved|sweep] */
const L = require('./theme-r6-collection-pages-lib.cjs');
const {ok, eq, frames, settle, counter} = L;
const NAME = 'featured-blog-header';
const only = process.argv.slice(2);
const POST = {id: 1, title: 'Planting the spring beds', handle: 'news/planting', url: '/blogs/news/planting', author: 'Ana Ruiz', content: '<p>First paragraph of the post, long enough to wrap onto a second line.</p>', excerpt: 'First paragraph.', image: {url: 'https://theme.test/a.png', src: 'https://theme.test/a.png', width: 1600, height: 900, aspect_ratio: 1.78, alt: 'Beds'}};
const WITH = [{type: 'article', settings: {article: POST}}];
const NONE = [{type: 'article', settings: {}}];
const BASE = {remove_description_text: false};

const sig = page => page.evaluate(() => {
  const R = document.querySelector('#shopify-section-test [data-lcp]');
  if (!R) return null;
  const hb = R.querySelector('[id^="hero-banner-2-"]');
  const cs = (el, p) => el ? Object.fromEntries(p.map(k => [k, getComputedStyle(el)[k]])) : null;
  const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top - hb.getBoundingClientRect().top), Math.round(b.width), Math.round(b.height)]; };
  const vis = el => el && !el.hidden && getComputedStyle(el).display !== 'none' ? el : null;
  const a = R.querySelector('.featured_link3');
  return {
    cls: [...R.classList].sort().join(' '), hb: cs(hb, ['backgroundColor', 'paddingTop', 'paddingBottom', 'marginTop', 'marginBottom']),
    img: [...r(R.querySelector('.featured_main3-image')), ...Object.values(cs(R.querySelector('.featured_main3-image'), ['filter', 'borderTopLeftRadius', 'zIndex']))],
    label: [R.querySelector('.featured_article3').textContent.trim(), getComputedStyle(R.querySelector('.featured_article3')).color],
    title: cs(R.querySelector('.featured_title3'), ['fontSize', 'color', 'fontFamily', 'fontWeight']),
    desc: vis(R.querySelector('.featured_description3')) && cs(R.querySelector('.featured_description3'), ['color', 'fontFamily', 'fontWeight']),
    btn: vis(a) && {t: a.textContent.trim(), own: a.hasAttribute('data-own-shape'), ...cs(a, ['backgroundColor', 'color', 'borderTopColor', 'borderTopLeftRadius', 'borderTopWidth', 'fontSize', 'fontWeight'])},
  };
});

async function content(browser) {
  const store = await L.render(NAME, {editing: false, blocks: NONE});
  eq(store.html.replace(/<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, '').trim(), '', 'storefront with no post: nothing');
  const ed = await L.render(NAME, {editing: true, blocks: NONE});
  const markup = ed.html.replace(/<style[\s\S]*?<\/style>/g, '');
  ok(/fbh-skeleton/.test(markup) && !/Featured Blog Title|Lorem|ipsum|Article Title|Intro to article/.test(markup), 'builder with no post: outlines, nothing made up');
  ok(/<h2 class="featured_title3"/.test(markup) && !/<h1/.test(markup), 'the title is an h2');
  const real = await L.render(NAME, {editing: false, blocks: WITH, settings: BASE});
  ok(/Planting the spring beds/.test(real.html) && /href="\/blogs\/news\/planting"/.test(real.html), 'with a post: its title and link');
  for (const width of [375, 1366]) for (const [label, blocks, editing] of [['none', NONE, true], ['post', WITH, false]]) {
    const t = await L.mount(browser, NAME, {width, editing, blocks, settings: BASE, assets: [L.CTRL]});
    ok(await t.noOverflow(), 'no sideways scroll ' + label + ' ' + width);
    if (label === 'post') ok((await t.root('.featured_link3').boundingBox()).height >= 44 || width > 500, '44px button ' + width);
    await t.page.screenshot({path: require('path').join(process.env.SHOTS || require('os').tmpdir(), 'r6-featured-post-' + label + '-' + width + '.png')});
    eq(t.errors, [], 'no errors ' + label + ' ' + width);
    await t.page.close();
  }
}

async function themeFirst(browser) {
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const t = await L.mount(browser, NAME, {width, editing, assets: [L.CTRL], blocks: WITH, settings: BASE});
    const read = async () => (await settle(t.page), {bg: await t.css('[id^="hero-banner-2-"]', 'backgroundColor'), tf: await t.css('.featured_title3', 'fontFamily'), tw: await t.css('.featured_title3', 'fontWeight'), df: await t.css('.featured_description3', 'fontFamily'), bb: await t.css('.featured_link3', 'backgroundColor'), tc: await t.css('.featured_title3', 'color')});
    const theme = await read();
    eq([theme.bg, theme.tf, theme.tw, theme.df, theme.bb, theme.tc], ['rgb(24, 32, 40)', 'Georgia', '700', 'Arial', 'rgb(18, 52, 86)', 'rgb(255, 255, 255)'], 'theme first ' + width);
    await t.redraw({settings: {...BASE, section_bg_color: '#ff0000', button_bg_color: '#00ff00'}}); await frames(t.page);
    eq(await read(), theme, 'colours wait for Enable custom styling ' + width);
    const ON = {enable_custom_style: true, section_bg_color: '#ee1122', featured_title_text_color: '#11ee22', button_bg_color: '#2233ee', use_theme_fonts: false, title_font: {...L.FONT, weight: 300}, description_font: L.MONO};
    const want = async label => { const r = await read(); ok(/Verdana/.test(r.tf) && /Courier New/.test(r.df), label + ' fonts ' + JSON.stringify(r)); eq([r.bg, r.tc, r.bb, r.tw], ['rgb(238, 17, 34)', 'rgb(17, 238, 34)', 'rgb(34, 51, 238)', '300'], label + ' colours and weight'); };
    const back = async label => { eq(await read(), theme, label + ' restored'); eq(await t.page.locator('#shopify-section-test [data-own-font]').count(), 0, label + ' attributes gone'); };
    await t.emit(ON); await frames(t.page); await want('live on ' + width);
    await t.emit({enable_custom_style: false, use_theme_fonts: true}); await frames(t.page); await back('live off ' + width);
    await t.redraw({settings: {...BASE, ...ON}}); await frames(t.page); await want('redraw on ' + width);
    await t.redraw({settings: {...BASE, enable_custom_style: false, use_theme_fonts: true}}); await frames(t.page); await back('redraw off ' + width);
    await t.emit({use_theme_button: false, button_border_radius: 3}); await frames(t.page);
    eq([await t.page.locator('#shopify-section-test .featured_link3[data-own-shape]').count(), await t.css('.featured_link3', 'borderTopLeftRadius')], [1, '3px'], 'own button shape wins ' + width);
    await t.emit({use_theme_button: true}); await frames(t.page);
    eq(await t.page.locator('#shopify-section-test [data-own-shape]').count(), 0, 'theme button shape back ' + width);
    await t.emit({color_scheme: 'alt-scheme'}); await frames(t.page);
    eq(await t.css('[id^="hero-banner-2-"]', 'backgroundColor'), 'rgb(250, 250, 250)', 'scheme live ' + width);
    eq(t.errors, [], 'no errors ' + width);
    await t.page.close();
  }
}

const look = page => page.evaluate(() => {
  const hb = document.querySelector('#shopify-section-S [id^="hero-banner-2-"]');
  if (!hb) return {none: document.getElementById('shopify-section-S').textContent.trim()};
  const cs = (el, p) => el ? p.map(k => getComputedStyle(el)[k]) : null, r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
  const vis = el => el && el.getClientRects().length && el.getBoundingClientRect().height > 0 && getComputedStyle(el).display !== 'none' ? el : null;
  const t = hb.querySelector('.featured_title3'), a = hb.querySelector('.featured_link3'), d = vis(hb.querySelector('.featured_description3'));
  return {hb: [...cs(hb, ['backgroundColor', 'paddingTop', 'marginTop']), ...r(hb)], img: [...cs(hb.querySelector('.featured_main3-image'), ['filter', 'borderTopLeftRadius']), ...r(hb.querySelector('.featured_main3-image'))],
    label: [hb.querySelector('.featured_article3').textContent.trim(), ...cs(hb.querySelector('.featured_article3'), ['color', 'fontSize']), ...r(hb.querySelector('.featured_article3'))],
    title: [t.textContent.trim(), ...cs(t, ['fontSize', 'color', 'fontFamily', 'fontWeight', 'textTransform', 'lineHeight']), ...r(t)], desc: d && [...cs(d, ['color', 'fontSize']), ...r(d)],
    btn: vis(a) && [a.textContent.trim(), ...cs(a, ['backgroundColor', 'color', 'borderTopColor', 'borderTopLeftRadius', 'borderTopWidth', 'fontSize', 'fontWeight', 'paddingTop']), ...r(a)]};
});

(async () => {
  L.schemaChecks(NAME, ['General', 'Content', 'Media', 'Appearance', 'Buttons', 'Typography', 'Animation', 'Desktop spacing', 'Mobile']);
  const browser = await L.launch();
  try {
    if (!only.length || only.includes('content')) await content(browser);
    if (!only.length || only.includes('theme')) await themeFirst(browser);
    if (!only.length || only.includes('life')) {
      for (const [settings, blocks] of [[BASE, WITH], [{}, NONE], [{...BASE, enable_custom_style: true, section_bg_color: '#ee1122', use_theme_fonts: false, title_font: L.FONT, description_font: L.MONO, use_theme_button: false, button_border_radius: 2, article_image_ratio_mobile: '4-3'}, WITH]])
        await L.firstPaint(browser, NAME, {settings, blocks, sig});
      /* reveal: never hides in the builder or under reduced motion */
      for (const [editing, reducedMotion] of [[true, 'no-preference'], [false, 'reduce']]) {
        const t = await L.mount(browser, NAME, {width: 1366, editing, reducedMotion, blocks: WITH, settings: {...BASE, reveal: true}, theme: {scroll_animation: 'fade_in'}, assets: [L.CTRL]});
        eq(await t.page.evaluate(() => getComputedStyle(document.getElementById('shopify-section-test')).opacity), '1', 'reveal does not hide ' + (editing ? 'in the builder' : 'under reduced motion'));
        await t.page.close();
      }
      await L.twoInstances(browser, NAME, {settings: BASE, blocks: WITH, edit: {featured_title_font_size_desktop: 51, button_text: 'Only b'}, read: (t, uid) => t.page.evaluate(uid => { const R = document.querySelector('#shopify-section-' + uid); return [getComputedStyle(R.querySelector('.featured_title3')).fontSize, R.querySelector('.featured_link3').textContent.trim()]; }, uid)});
    }
    if (!only.length || only.includes('saved')) {
      const sec = JSON.parse(L.read('templates/blog.json')).sections.featured_blog_header_fF4ac9;
      const blocks = Object.values(sec.blocks).map(b => ({type: b.type, settings: {...b.settings, article: {...POST, handle: b.settings.article, url: '/blogs/' + b.settings.article}}}));
      await L.saved(browser, NAME, {inst: {settings: sec.settings, blocks, toggles: {enable_custom_style: true}}, look, label: 'templates/blog.json featured_blog_header_fF4ac9 (with a post)'});
      await L.saved(browser, NAME, {inst: {settings: {...sec.settings, remove_description_text: false, hide_read_more_button: false}, blocks, toggles: {enable_custom_style: true}}, look, label: 'with its text and button shown', widths: [1366]});
    }
    if (!only.length || only.includes('sweep')) await L.sweep(browser, NAME, {base: BASE, blocks: WITH, sig,
      pre: {section_bg_color: {enable_custom_style: true}, featured_title_text_color: {enable_custom_style: true}, description_maintext_color: {enable_custom_style: true}, button_bg_color: {enable_custom_style: true}, button_text_color: {enable_custom_style: true}, button_border_color: {enable_custom_style: true, use_theme_button: false},
        button_bg_hover_color: {enable_custom_style: true}, button_border_hover_color: {enable_custom_style: true},
        button_border_radius: {use_theme_button: false}, read_more_font_size_desktop: {use_theme_button: false}, read_more_font_size_mobile: {use_theme_button: false}, read_more_button_border_weight: {use_theme_button: false}, read_more_font_weight: {use_theme_button: false},
        title_font: {use_theme_fonts: false, title_font: L.MONO, description_font: L.MONO}, description_font: {use_theme_fonts: false, title_font: L.MONO, description_font: L.MONO}, use_theme_fonts: {title_font: L.FONT, description_font: L.MONO}},
      skip: new Set(['article.article', 'article.custom_image', 'button_bg_hover_color', 'button_border_hover_color', 'reveal', 'reset_spacing']),
      same: {all: new Set(['enable_custom_style', 'section_width:fluid_container', 'section_width:stretch_width']), 375: new Set(['desktop_article_image_width', 'desktop_article_image_height', 'article_image_y_index_desktop', 'section_margin_top_desktop', 'section_margin_bottom_desktop', 'featured_title_font_size_desktop', 'read_more_font_size_desktop']),
        1366: new Set(['mobile_article_image_width', 'article_image_ratio_mobile', 'article_image_z_index_mobile', 'article_image_y_index_mobile', 'section_margin_top_mobile', 'section_margin_bottom_mobile', 'featured_title_font_size_mobile', 'read_more_font_size_mobile'])}, lenientSame: true});
  } finally { await browser.close(); }
  console.log(counter.checks + ' featured post banner round 6 checks passed');
})().catch(e => { console.error(e); process.exit(1); });
