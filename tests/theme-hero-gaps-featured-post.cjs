/* Featured post banner (sections/featured-blog-header) on phones.
   With a wide or square picture (the default 16:9) the picture is too short
   to hold the text over it, so at 375 the text sits in its own panel under
   the picture in the section's colour scheme; a tall picture keeps the text
   over it, as on desktop. At 375, on a dark and a light scheme, live and on
   a redraw:
   - every text (label, title, text, button) reads at 4.5:1 or more against
     what is behind it, and sits below the picture;
   - a tall picture still holds the text, and a creator's own text colours
     still apply in the panel;
   - desktop (1366) and the tall shapes look exactly as before round 7 (5c5d843), the saved
     templates/blog.json instance included.
   LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-hero-gaps-featured-post.cjs */
const assert = require('assert/strict'), fs = require('fs'), path = require('path'), {execSync} = require('child_process');
const {launch, mount} = require('./media-fixture.cjs');
const NAME = 'featured-blog-header', CTRL = 'live-collection-pages.js';
const POST = {id: 1, title: 'Planting the spring beds this year', handle: 'news/planting', url: '/blogs/news/planting', author: 'Ana Ruiz', content: '<p>First paragraph of the post, long enough to wrap onto a second line.</p>', excerpt: 'First paragraph.', image: {url: 'https://theme.test/a.png', src: 'https://theme.test/a.png', width: 1600, height: 900, aspect_ratio: 1.78, alt: 'Beds'}};
const WITH = [{type: 'article', settings: {article: POST}}];
const BASE = {remove_description_text: false};
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const settle = async page => { await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); await page.evaluate(() => document.getAnimations().forEach(a => { if (a instanceof CSSTransition) a.finish(); })); };

/* contrast of each text against the colour behind it, and where it sits against the picture */
const read = page => page.evaluate(() => {
  const hb = document.querySelector('#shopify-section-test [id^="hero-banner-2-"]');
  const rgb = s => { const m = s.match(/[\d.]+/g).map(Number); return {r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1}; };
  const over = (top, under) => ({r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1});
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const behind = el => { let bg = {r: 0, g: 0, b: 0, a: 0}; const stack = []; for (let n = el; n; n = n.parentElement) stack.unshift(n); let acc = {r: 255, g: 255, b: 255, a: 1}; for (const n of stack) { const c = rgb(getComputedStyle(n).backgroundColor); if (c.a) acc = over(c, acc); } return acc; };
  const img = hb.querySelector('.featured_main3-image').getBoundingClientRect();
  const out = {};
  for (const [k, sel] of [['label', '.featured_article3'], ['title', '.featured_title3'], ['text', '.featured_description3'], ['button', '.featured_link3']]) {
    const el = hb.querySelector(sel), r = el.getBoundingClientRect(), fg = rgb(getComputedStyle(el).color);
    out[k] = {ratio: Math.round(ratio(over(fg, behind(el)), behind(el)) * 100) / 100, below: r.top >= img.bottom - 0.5, over: r.top >= img.top && r.bottom <= img.bottom + 0.5, color: getComputedStyle(el).color};
  }
  out.img = [Math.round(img.width), Math.round(img.height)];
  out.overflow = document.documentElement.scrollWidth > innerWidth + 1;
  return out;
});
/* geometry and colours of everything in the section, for old vs new */
const shape = page => page.evaluate(() => {
  const w = document.getElementById('shopify-section-test'), w0 = w.getBoundingClientRect(), out = [];
  for (const el of w.querySelectorAll('*')) {
    if (el.closest('style,script')) continue;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    out.push([el.tagName, el.className, Math.round(r.left - w0.left), Math.round(r.top - w0.top), Math.round(r.width), Math.round(r.height), cs.color, cs.backgroundColor, cs.fontSize, cs.zIndex].join('|'));
  }
  return out;
});

(async () => {
  const browser = await launch();
  const nowPath = path.join(__dirname, '../sections', NAME + '.storelib'), nowRaw = fs.readFileSync(nowPath, 'utf8');
  const headRaw = execSync('git show 5c5d843:sections/' + NAME + '.storelib', {cwd: path.join(__dirname, '..'), encoding: 'utf8'});
  const draw = async (raw, opts) => { const real = fs.readFileSync; fs.readFileSync = (f, ...a) => String(f) === nowPath ? raw : real(f, ...a); try { return await mount(browser, NAME, opts); } finally { fs.readFileSync = real; } };
  try {
    for (const scheme of ['default-color-scheme', 'alt-scheme']) for (const editing of [true, false]) {
      const where = scheme + (editing ? ' editor' : ' storefront');
      const t = await mount(browser, NAME, {width: 375, editing, settings: {...BASE, color_scheme: scheme}, blocks: WITH, assets: [CTRL]});
      await settle(t.page);
      const check = async label => {
        const r = await read(t.page);
        for (const k of ['label', 'title', 'text', 'button']) {
          ok(r[k].ratio >= 4.5, `${where} ${label}: ${k} contrast ${r[k].ratio} >= 4.5`);
          ok(r[k].below, `${where} ${label}: ${k} sits under the picture`);
        }
        ok(r.img[1] > 150 && r.img[1] < 200, `${where} ${label}: the picture keeps its 16:9 shape (${r.img})`);
        ok(!r.overflow, `${where} ${label}: no sideways scroll`);
        ok((await t.page.locator('#shopify-section-test .featured_link3').boundingBox()).height >= 44, `${where} ${label}: 44px button`);
        return r;
      };
      const first = await check('first paint');
      /* live edits come from the builder, where the settings are printed (request.design_mode) */
      if (editing) {
        /* live: a tall shape puts the text over the picture, back to 16:9 brings the panel back */
        await t.emit({article_image_ratio_mobile: '2-3'}); await settle(t.page);
        const tall = await read(t.page);
        ok(['label', 'title', 'button'].every(k => tall[k].over), `${where}: a tall picture holds the text over it, live`);
        const r2 = await mount(browser, NAME, {width: 375, editing, settings: {...BASE, color_scheme: scheme, article_image_ratio_mobile: '2-3'}, blocks: WITH, assets: [CTRL]}); await settle(r2.page);
        eq(await read(r2.page), tall, `${where}: tall shape live equals redraw`);
        await r2.page.close();
        await t.emit({article_image_ratio_mobile: '16-9'}); await settle(t.page);
        eq(await read(t.page), first, `${where}: back to 16:9 live`);
        for (const ratio of ['1-1', '4-3', '3-2', '2-1', '21-9']) {
          await t.emit({article_image_ratio_mobile: ratio}); await settle(t.page);
          const r = await read(t.page);
          ok(['label', 'title', 'text', 'button'].every(k => r[k].below && r[k].ratio >= 4.5), `${where}: ${ratio} picture, the text reads in its panel`);
        }
        await t.emit({article_image_ratio_mobile: '16-9'}); await settle(t.page);
        /* the creator's own colours still reach the panel */
        await t.emit({enable_custom_style: true, featured_title_text_color: '#aa1133', description_maintext_color: '#1133aa'}); await settle(t.page);
        const own = await read(t.page);
        ok(own.title.color === 'rgb(170, 17, 51)' && own.text.color === 'rgb(17, 51, 170)' && own.label.color === 'rgb(17, 51, 170)', `${where}: custom text colours apply in the panel live`);
        const r3 = await mount(browser, NAME, {width: 375, editing, settings: {...BASE, color_scheme: scheme, enable_custom_style: true, featured_title_text_color: '#aa1133', description_maintext_color: '#1133aa'}, blocks: WITH, assets: [CTRL]}); await settle(r3.page);
        eq(await read(r3.page), own, `${where}: custom colours live equal redraw`);
        await r3.page.close();
      }
      eq(t.errors, [], where + ': no errors');
      await t.page.close();
    }
    /* unchanged where the text already sat over the picture: desktop, tall shapes, the saved instance */
    const sec = JSON.parse(fs.readFileSync(path.join(__dirname, '../templates/blog.json'), 'utf8')).sections.featured_blog_header_fF4ac9;
    const savedBlocks = Object.values(sec.blocks).map(b => ({type: b.type, settings: {...b.settings, article: {...POST, handle: b.settings.article, url: '/blogs/' + b.settings.article}}}));
    const SAME = [
      ['default 16:9', 1366, BASE, WITH], ['dark tall 2:3', 375, {...BASE, article_image_ratio_mobile: '2-3'}, WITH], ['light 9:16', 375, {...BASE, color_scheme: 'alt-scheme', article_image_ratio_mobile: '9-16'}, WITH],
      ['4:5', 375, {...BASE, article_image_ratio_mobile: '4-5'}, WITH], ['3:4', 375, {...BASE, article_image_ratio_mobile: '3-4'}, WITH], ['5:7', 375, {...BASE, article_image_ratio_mobile: '5-7'}, WITH],
      ['blog.json saved', 375, sec.settings, savedBlocks], ['blog.json saved', 1366, sec.settings, savedBlocks],
    ];
    for (const [label, width, settings, blocks] of SAME) for (const editing of [true, false]) {
      const a = await draw(headRaw, {width, editing, settings, blocks, assets: [CTRL]}), b = await draw(nowRaw, {width, editing, settings, blocks, assets: [CTRL]});
      await settle(a.page); await settle(b.page);
      eq(await shape(b.page), await shape(a.page), `${label} ${width} ${editing ? 'editor' : 'storefront'}: looks the same as before round 7 (5c5d843)`);
      await a.page.close(); await b.page.close();
    }
    console.log(checks + ' featured post banner phone panel, contrast, live and unchanged-look checks passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
