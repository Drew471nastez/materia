/* Run: node tests/theme-rtl.cjs
   Right-to-left pages. The creator turned on Theme settings > Reading
   direction (or the page's language is in the right-to-left list) and the
   cart drawer opened in the middle of the page over the header, the header
   and menus were half mirrored and "Your cart is currently empty." read
   ".Your cart is currently empty".
   1. One rule everywhere: layout/theme, layout/password and every section
      and snippet that draws a side-specific class read right to left as
      "the setting is on, or the language is in the list". The snippets used
      to drop the setting whenever the list was filled in (it is by default),
      so the page said rtl and the drawer's classes said ltr. Rendered here
      with the real Liquid of each file.
   2. shopify/assets/rtl.css, loaded only for a right-to-left page (and by
      the builder's live preview), puts each drawer, sheet and popup at the
      right edge of the viewport whatever side classes its markup carries:
      drawn in Chromium at 375px and 1366px with the theme's own CSS, with
      markup from snippets/minicart, horizontal-menu, search-popup,
      facets-panel, the product card and the marquee bar, in both the
      left-to-right and the right-to-left class shapes.
   3. Text: each line reads in its own direction (full stop and "!" at the
      end of an English line, an Arabic line right to left) and lines up on
      the right; no element is pushed wider than the viewport.
   4. With LIVE unset, the live home, product and collection pages are drawn
      right to left with this repository's CSS and checked the same way.
   It does not replace Storelib's renderer. LIVE=0 skips the live pages. */
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('module');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const LIVE = 'https://andrewrullz.storelib.com';

// The real-template renderer from tests/theme-search-collection.cjs, without its own run.
const helperPath = path.join(__dirname, 'theme-search-collection.cjs'), helperSource = fs.readFileSync(helperPath, 'utf8');
const helper = new Module(helperPath, module); helper.filename = helperPath; helper.paths = module.paths;
helper._compile(helperSource.slice(0, helperSource.indexOf('(async () => {')) + '\nmodule.exports={renderTemplate,stubs,themeRoot};', helperPath);
const h = helper.exports;

const FILES = [
  ...['layout/theme.storelib', 'layout/password.storelib'],
  ...fs.readdirSync(path.join(root, 'sections')).map(f => 'sections/' + f),
  ...fs.readdirSync(path.join(root, 'snippets')).map(f => 'snippets/' + f),
].filter(f => f.endsWith('.storelib') && /enable_rtl/.test(read(f)));

let passed = 0;
const group = async (name, fn) => { await fn(); passed++; console.log('ok', name); };

/* ───────── 1. The rule ───────── */
function rtlBlock(src) {
  // The {% liquid %} block (or the plain tags) that work out enable_rtl.
  const i = src.indexOf('assign enable_rtl');
  const start = src.lastIndexOf('{%', i);
  const end = src.indexOf('%}', src.indexOf('enable_rtl', src.lastIndexOf('assign enable_rtl = true')) ) + 2;
  return src.slice(start, end).replace(/assign bage_positon[\s\S]*$/, '%}');
}
const decide = (src, settings, iso) => h.renderTemplate(rtlBlock(src) + '[{% if enable_rtl %}rtl{% else %}ltr{% endif %}]', {settings, request: {locale: {iso_code: iso}}}, {stubs: h.stubs, files: {}, rendered: new Set()}).match(/\[(rtl|ltr)\]/)[1];

(async () => {
  await group('one reading-direction rule in every file that draws a side', () => {
    assert(FILES.length >= 25, `files ${FILES.length}`);
    const LIST = 'ar,iw,he,ur,ug';
    for (const f of FILES) {
      const src = read(f);
      if (!/assign enable_rtl/.test(src)) continue; // reads one handed in
      assert(!/assign enable_rtl = false\s*\n\s*endif/.test(src.replace(/^[\s\S]*?assign enable_rtl = (false|settings\.rtl)/, '')), `${f}: the language list no longer turns the setting off`);
      assert.equal(decide(src, {rtl: true, language_rtl: LIST}, 'en'), 'rtl', `${f}: setting on, English`);
      assert.equal(decide(src, {rtl: false, language_rtl: LIST}, 'ar'), 'rtl', `${f}: Arabic`);
      assert.equal(decide(src, {rtl: false, language_rtl: LIST}, 'en'), 'ltr', `${f}: English`);
      assert.equal(decide(src, {rtl: false, language_rtl: LIST}, ''), 'ltr', `${f}: no language`);
      assert.equal(decide(src, {rtl: false, language_rtl: ''}, 'ar'), 'ltr', `${f}: empty list`);
    }
    // Side classes follow enable_rtl, never the setting alone.
    for (const f of ['snippets/product-item.storelib', 'sections/products-grid.storelib', 'snippets/product-item-bundle.storelib'])
      assert(!/\{%-? if settings\.rtl -?%\}|^\s*if settings\.rtl\s*$/m.test(read(f)), `${f} reads settings.rtl directly`);
    const layout = read('layout/theme.storelib');
    assert.match(layout, /dir="\{% if enable_rtl %\}rtl\{% else %\}ltr\{% endif %\}"/);
    assert.match(layout, /\{% if enable_rtl %\}\{\{ 'rtl\.css' \| asset_url \| stylesheet_tag/);
    // The builder's live preview applies the same rule when either setting changes.
    const live = read('snippets/theme-live.storelib');
    assert.match(live, /has\(s, 'rtl'\) \|\| has\(s, 'language_rtl'\)/);
    assert.match(live, /setRtl\(rtlOn \|\| \(!!rtlIso && !!rtlLanguages && rtlLanguages\.indexOf\(rtlIso\) !== -1\)\)/);
  });

  await group('templates write sides and alignment the logical way', () => {
    for (const d of ['sections', 'snippets']) for (const f of fs.readdirSync(path.join(root, d))) {
      const src = read(d + '/' + f);
      assert(!/^\s*text-align: *left( !important)?;/m.test(src), `${d}/${f}: text-align: left (start reads right to left too)`);
    }
    assert(!read('sections/promotional-popup.storelib').includes('direction: ltr'), 'the popup no longer forces its text left to right');
    const ab = read('sections/announcement-bar-basic.storelib');
    assert(ab.includes('inset-inline-end: 20px') && ab.includes("assign ab_text_align = 'start'"));
    for (const f of ['sections/breadcrumb.storelib', 'sections/page-heading.storelib', 'sections/main-collection-heading.storelib'])
      assert(read(f).includes('scaleX(var(--rtl-flip, 1)) rotate(45deg)'), `${f}: chevron turns for right to left`);
    assert(read('sections/slideshow.storelib').includes('inset-inline-start: 0;'), 'rating stars fill from the reading start');
  });

  /* ───────── 2 and 3. The theme's CSS, right to left ───────── */
  const strip = s => s.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '').replace(/\{%[\s\S]*?%\}/g, '').replace(/\{\{[^}]*\}\}/g, 'x');
  const sticky = read('snippets/header-sticky-controller.storelib');
  const marquee = read('sections/marquee-bar.storelib');
  const CSS = [
    'critical.css', 'theme.css', 'navigation.css', 'swiper-bundle.min.css', 'product-card.css', 'minicart.css', 'cart-drawer.css', 'search-type-default.css', 'collection-page.css',
  ].map(f => read('shopify/assets/' + f)).join('\n')
    + strip(sticky.match(/<style>([\s\S]*?)<\/style>/)[1])
    + strip(marquee.slice(marquee.indexOf('{% stylesheet %}') + 16, marquee.indexOf('{% endstylesheet %}')));
  const RTL = read('shopify/assets/rtl.css');
  const ROOT_VARS = ':root{--responsive-rate:((100vw - 575px) / (1600 - 575));--heading-font-scale:1}';
  const drawerClass = rtl => `minicart__wrapper flex flex-column color-default bls__drawer fixed z-15 inset-y-0 h-full transition-popup${rtl ? ' right left-0' : ' left right-0'}`;
  const filterClass = rtl => `custom-scrollbar collection-filter transition-popup drawer w-full color-default bls__drawer fixed z-16 inset-y-0 h-full${rtl ? ' left right-0' : ' right left-0'}`;
  const body = rtl => `
<section class="unique-announcement-bar" style="position:relative;height:40px"><span class="ab-msg">Complimentary shipping over $400.</span>
  <div class="announcement-bar-close absolute${rtl ? ' left-0' : ' right-0'} top-0 w-30 h-full" style="width:30px">×</div></section>
<header class="header" style="position:relative;height:60px">
  <nav class="flex flex-column mobile block-1025 navigation horizontal fixed inset-0" id="nav">
    <close-menu class="close-menu pointer absolute top-0 w-55 h-55 inline-flex hidden-1025 content-center${rtl ? ' left-7' : ' right-7'}">×</close-menu>
    <ul class="horizontal-list"><li class="level0"><menu-item class="relative flex"><a href="/">Home</a><open-children-toggle></open-children-toggle></menu-item>
      <div class="submenu submenu-horizontal absolute" id="sub"><ul><li>Shirts</li></ul></div></li></ul>
  </nav>
</header>
<main style="padding:0 15px">
  <p id="en">Your cart is currently empty.</p>
  <p id="ar">سلة التسوق فارغة!</p>
  <div class="text-center"><p id="centred">Spend R$150.00 more to enjoy Free shipping!</p></div>
  <div class="text-left" id="startbox"><p id="start">You may check out all the available products.</p></div>
  <button class="btn-primary" id="btn" style="width:300px">Continue Shopping</button>
  <div class="product-item relative" style="width:300px;height:200px">
    <div class="label-set absolute z-1${rtl ? ' right-10 right-1025-15' : ' left-10 left-1025-15'} top-10" id="label">New</div>
  </div>
  <div class="search__type-popup-bar${rtl ? ' search__type-popup-bar--rtl' : ''}" style="position:relative;width:300px">
    <form class="search__type-popup-form"><div class="search__type-popup-field" style="position:relative">
      <input class="search__type-popup-input search__input" id="q" placeholder="Search" style="width:300px">
      <button class="search__type-popup-submit" id="qsubmit" type="submit" style="position:absolute;top:0;width:40px;height:40px">⌕</button>
    </div></form>
  </div>
  <div class="facets facets--vertical"><div class="facets__layout">
    <div class="facets-panel facets-panel--vertical" id="facets" popover="manual"><div class="facets-panel__body">Availability</div></div>
    <div class="grid">Products</div>
  </div></div>
  <div class="scrolling-marquee-1" style="--scrolling-section-width:100%"><div class="scrolling__marquee" id="marquee">
    <div class="scrolling__marquee-wrapper" id="mq1"><div class="scrolling__marquee-item">100% Organic</div><div class="scrolling__marquee-item">Grass Fed</div><div class="scrolling__marquee-item">No Artificial Ingredients</div></div>
    <div class="scrolling__marquee-wrapper" aria-hidden="true"><div class="scrolling__marquee-item">100% Organic</div><div class="scrolling__marquee-item">Grass Fed</div><div class="scrolling__marquee-item">No Artificial Ingredients</div></div>
  </div></div>
</main>
<cart-notification id="minicart_wrapper" class="minicart open_drawer"><div class="${drawerClass(rtl)}" id="cart" style="--materia-cart-width:500px">
  <div class="minicart__header flex justify-between"><div class="h5 minicart-heading">Your Cart <span class="cart-count">(0)</span></div><button class="close-cart-button" aria-label="Close">×</button></div>
</div></cart-notification>
<div class="${filterClass(rtl)}" id="filter">Filter</div>`;
  const doc = (rtl, {early = true} = {}) => `<!doctype html><html lang="en" dir="rtl" class="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>${h.themeRoot()}${ROOT_VARS}</style>${early ? `<style>${RTL}</style>` : ''}<style>${CSS}</style>${early ? '' : `<style>${RTL}</style>`}</head>
<body class="rtl open-drawer">${body(rtl)}</body></html>`;

  const browser = await chromium.launch({executablePath: ['/usr/bin/chromium', '/opt/pw-browsers/chromium'].find(f => fs.existsSync(f)), headless: true, args: ['--no-sandbox']});
  try {
    const rect = (p, sel) => p.$eval(sel, el => { const r = el.getBoundingClientRect(); return {l: r.left, r: r.right, w: r.width, t: r.top}; });
    const W = p => p.evaluate(() => document.documentElement.clientWidth);
    const overflow = p => p.evaluate(() => {
      const W = document.documentElement.clientWidth, out = [];
      if (document.documentElement.scrollWidth > W + 1) out.push('page ' + document.documentElement.scrollWidth + ' > ' + W);
      for (const el of document.querySelectorAll('main *, header *, section *')) {
        if (el.closest('[popover], .navigation.mobile, .scrolling__marquee')) continue;
        const r = el.getBoundingClientRect();
        if (r.width && (r.left < -1 || r.right > W + 1)) out.push(el.tagName + '.' + el.className + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
      }
      return out;
    });
    // The first and last letter of a line: an English line ends on the right.
    const ends = (p, sel) => p.$eval(sel, el => {
      const t = el.firstChild, r = document.createRange();
      r.setStart(t, 0); r.setEnd(t, 1); const first = r.getBoundingClientRect();
      r.setStart(t, t.length - 1); r.setEnd(t, t.length); const last = r.getBoundingClientRect();
      r.selectNodeContents(el); const all = r.getBoundingClientRect(), box = el.getBoundingClientRect();
      return {first: first.left, last: last.left, gapRight: box.right - all.right, gapLeft: all.left - box.left};
    });

    for (const width of [375, 1366]) for (const rtl of [false, true]) for (const early of [true, false]) {
      const label = `${width}px, ${rtl ? 'right-to-left' : 'left-to-right'} classes, rtl.css ${early ? 'before' : 'after'} the theme's CSS`;
      await group(label, async () => {
        const page = await browser.newPage({viewport: {width, height: 800}});
        const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
        await page.setContent(doc(rtl, {early}));
        const vw = await W(page);
        assert.deepEqual(await overflow(page), [], 'nothing wider than the viewport');

        // Cart drawer: off the left edge while closed, at the left edge when open.
        let r = await rect(page, '#cart');
        assert(r.r <= 1, `closed cart drawer is off screen (${r.l}..${r.r})`);
        await page.$eval('#cart', el => el.classList.add('open'));
        await page.waitForTimeout(700);
        r = await rect(page, '#cart');
        assert(Math.abs(r.l) <= 1 && r.r <= vw + 1 && r.w > 300, `open cart drawer at the left edge (${r.l}..${r.r})`);

        // Filter drawer (theme layout): at the right edge.
        await page.$eval('#filter', el => el.classList.add('open'));
        await page.waitForTimeout(700);
        r = await rect(page, '#filter');
        if (width < 1025) assert(Math.abs(r.r - vw) <= 1 && r.l >= -1, `filter drawer at the right edge (${r.l}..${r.r} of ${vw})`);

        // Text: own direction, lined up on the right; buttons stay centred.
        let e = await ends(page, '#en');
        assert(e.last > e.first, 'English line ends on the right, full stop last');
        assert(e.gapRight < 2 && e.gapLeft > 20, 'English line lines up on the right');
        e = await ends(page, '#ar');
        assert(e.last < e.first, 'Arabic line reads right to left');
        e = await ends(page, '#centred');
        assert(Math.abs(e.gapRight - e.gapLeft) < 3, 'centred stays centred ' + JSON.stringify(e) + await page.$eval('#centred', el => getComputedStyle(el).textAlign + '/' + getComputedStyle(el.parentElement).textAlign + '/' + el.getBoundingClientRect().width));
        e = await ends(page, '#start');
        assert(e.gapRight < 2, '"start" alignment is the right edge');
        e = await ends(page, '#btn');
        assert(Math.abs(e.gapRight - e.gapLeft) < 3, 'button text centred');

        // Corners and ends mirror.
        r = await rect(page, '.announcement-bar-close');
        assert(r.l <= 1, 'announcement close button on the left');
        const card = await rect(page, '.product-item'), lab = await rect(page, '#label');
        assert(card.r - lab.r < 30 && lab.l - card.l > 100, 'card badge in the top right corner');
        const field = await rect(page, '#q'), submit = await rect(page, '#qsubmit');
        assert(submit.l - field.l < 20, 'search button at the left end of the field');
        assert.equal(await page.$eval('#q', el => getComputedStyle(el).paddingLeft), width < 768 ? '46px' : '52px');

        // Marquee track keeps its two copies side by side from the left.
        const mq = await rect(page, '#marquee'), first = await rect(page, '#mq1');
        assert(Math.abs(first.l - mq.l) < 2, `marquee starts at its left edge (${first.l} vs ${mq.l})`);

        // Filters: a sidebar in the page on a computer, a right-edge drawer on a phone.
        if (width >= 1025) {
          r = await rect(page, '#facets');
          assert(r.l >= 0 && r.r <= vw + 1, `filter sidebar in the page (${r.l}..${r.r})`);
        } else {
          await page.$eval('#facets', el => el.showPopover());
          await page.waitForTimeout(1200);
          r = await rect(page, '#facets');
          // The page under the open drawer keeps its scroll bar's room (collection-page.css):
          // the drawer's edge is the edge of what fixed layers can cover.
          const room = await page.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0'; document.body.append(d); const w = d.getBoundingClientRect().right; d.remove(); return w; });
          assert(Math.abs(r.r - room) <= 1 && r.l > 0, `filter drawer at the right edge (${r.l}..${r.r} of ${room})`);
          await page.$eval('#facets', el => el.hidePopover());

          // Phone menu: off the right edge while closed, filling the screen when open.
          r = await rect(page, '#nav');
          assert(r.l >= vw - 1, `closed menu off the right edge (${r.l})`);
          await page.evaluate(() => document.documentElement.classList.add('nav-open'));
          await page.waitForTimeout(800);
          r = await rect(page, '#nav');
          assert(Math.abs(r.l) <= 1 && Math.abs(r.r - vw) <= 1, `open menu fills the screen (${r.l}..${r.r})`);
          const close = await rect(page, '#nav close-menu');
          assert(close.l >= 0 && close.l < 30, 'menu close button on the left, in view');
          // A drill-down level waits off the left edge.
          r = await rect(page, '#sub');
          assert(r.r <= 1, `closed level off the left (${r.l}..${r.r})`);
        }
        assert.deepEqual(errors, []);
        await page.close();
      });
    }

    /* ───────── 4. The live pages, right to left with this repository's CSS ───────── */
    if (process.env.LIVE !== '0') {
      const pages = {'/': 'home', '/products/black-sleeves': 'product', '/collections/all': 'collection'};
      for (const [url, name] of Object.entries(pages)) {
        let html;
        try { html = await (await fetch(LIVE + url)).text(); } catch (err) { console.log('skip live', name, err.message); continue; }
        html = html.replace(/<html([^>]*?) dir="ltr"/, '<html$1 dir="rtl"').replace(/<html class="/, '<html class="rtl ').replace('</head>', '<link rel="stylesheet" href="/api/site-theme/assets/x/h-0/rtl.css"></head>');
        for (const width of [375, 1366]) await group(`live ${name} at ${width}px, right to left`, async () => {
          const ctx = await browser.newContext({viewport: {width, height: 800}});
          const page = await ctx.newPage();
          const errors = []; page.on('pageerror', e => errors.push(e.message));
          await page.route('**/*', route => {
            const req = route.request(), u = new URL(req.url());
            if (u.origin === LIVE && req.resourceType() === 'document') return route.fulfill({status: 200, contentType: 'text/html; charset=utf-8', body: html});
            const m = u.pathname.match(/\/api\/site-theme\/assets\/[^/]+\/[^/]+\/(.+)$/);
            if (m && fs.existsSync(path.join(root, 'shopify/assets', m[1]))) return route.fulfill({status: 200, contentType: m[1].endsWith('.css') ? 'text/css' : 'application/javascript', body: fs.readFileSync(path.join(root, 'shopify/assets', m[1]))});
            return route.continue();
          });
          await page.goto(LIVE + url, {waitUntil: 'load', timeout: 60000});
          await page.waitForTimeout(1500);
          const vw = await W(page);
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'no sideways scroll');
          const toggle = page.locator('.minicart__action:visible').first();
          if (await toggle.count()) {
            await toggle.click();
            await page.waitForTimeout(1000);
            const r = await rect(page, '.minicart__wrapper');
            assert(Math.abs(r.l) <= 1 && r.r <= vw + 1, `cart drawer at the left edge (${r.l}..${r.r})`);
          }
          assert.deepEqual(errors, []);
          await ctx.close();
        });
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`${passed} groups passed`);
})().catch(e => { console.error(e); process.exit(1); });
