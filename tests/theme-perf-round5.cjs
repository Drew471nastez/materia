/* Run: node tests/theme-perf-round5.cjs   (LIVE=0 skips the live site)
   Real-visitor speed, round 5: the first screen paints as soon as its own
   styles are in, and the first picture is the first thing fetched.

   Static, on the repository files:
   - <head> holds the page only for the theme's first-paint styles: popup.css
     and the review styles load without blocking (print swap, <noscript>
     copy), every head script is deferred or a module, no @import in the
     head styles.
   - The font library: its stylesheet host is warmed up without crossorigin
     (that connection is the one the stylesheet uses) and the font host with
     it; the speed script frees each font-library stylesheet in <head>.
   - Pictures: the slideshow's first slide is the priority picture (eager,
     fetchpriority high, decoded with its frame); every other slide and the
     closed menus' pictures are lazy, the menus' low (they were fetched at
     once and raised to high under the header). The logo is fetched for the
     size the header draws it at, not 400px.
   - Videos: gallery videos and slideshow videos / players carry their file
     in data-src (preload none) and start after the page has loaded; the
     poster is what the first screen paints.
   - Nothing in the first screen starts invisible: the product information's
     entrance is a rise only, and the scroll reveal hides only what starts
     below the first screen.
   Chromium, the theme's own code:
   - A font stylesheet that takes 2.5 s no longer holds the first paint
     (it did, measured the same way without the speed script) and still
     applies when it lands.
   - A gallery video gets its file only after the page has loaded and when
     it comes near the screen; a tap or play() before then starts it at once.
   - The slideshow (Swiper measures the page and clones slides) is built only
     once its first picture has been painted; the content tabs set their
     arrows after layout instead of measuring while the page is read.
   Live (LIVE unset): the home page's first picture is eager and high, its
   text is painted at full opacity in the first frame, and the font
   stylesheets are not render-blocking. */
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const NOOP = '{% comment %}{% endcomment %}';
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };
const between = (src, start, end) => {
  const a = src.indexOf(start);
  const b = src.indexOf(end, a);
  assert(a >= 0 && b > a, `markers ${start.slice(0, 40)} / ${end.slice(0, 40)}`);
  return src.slice(a, b + end.length);
};

const layout = read('layout/theme.storelib');
const speed = read('snippets/speed-optimization.storelib');
const responsive = read('snippets/responsive-image.storelib');
const slideshow = read('sections/slideshow.storelib');
const mediaLayout = read('snippets/product-media-layout.storelib');
const logo = read('snippets/logo.storelib');
const header = read('sections/theme-header.storelib');
const global = read('shopify/assets/global.js');
const animationCss = read('shopify/assets/animation.css');

/* 1. <head>: only the first-paint styles block. */
{
  const head = between(layout, '<head>', '</head>').replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
  const blocking = [...head.matchAll(/\{\{\s*'([^']+\.css)'\s*\|\s*asset_url\s*\|\s*stylesheet_tag([^}]*)\}\}/g)].map(m => m[1]);
  const allowed = ['critical.css', 'section-isolation.css', 'animation.css', 'rtl.css', 'product-card.css', 'swiper-bundle.min.css', 'design-mode.css', 'theme.css', 'theme-button-contract.css'];
  for (const f of blocking) ok(allowed.includes(f), `head: ${f} is a blocking stylesheet; only first-paint styles may hold the page`);
  for (const f of ['popup.css', 'judgeme-reviews.css']) {
    ok(new RegExp(`<link rel="stylesheet" href="\\{\\{ '${f.replace('.', '\\.')}' \\| asset_url \\}\\}" media="print" onload="this\\.media='all'">`).test(layout), `head: ${f} loads without blocking (print swap)`);
    ok(new RegExp(`<noscript>\\{\\{ '${f.replace('.', '\\.')}' \\| asset_url \\| stylesheet_tag \\}\\}</noscript>`).test(layout), `head: ${f} has its <noscript> copy`);
  }
  for (const m of head.matchAll(/<script\b[^>]*\bsrc=[^>]*>/g)) ok(/\bdefer\b|\basync\b|type="module"/.test(m[0]), `head: <script src> is deferred (${m[0].slice(0, 80)})`);
  for (const f of allowed.filter(f => fs.existsSync(path.join(__dirname, '..', 'shopify/assets', f)))) ok(!/@import\b/.test(read('shopify/assets/' + f)), `${f}: no @import (a second round trip before the first paint)`);
  for (const s of ['speed-optimization', 'font-variables', 'theme-controls', 'theme-scale', 'meta-tags']) {
    const src = read(`snippets/${s}.storelib`);
    ok(!/@import\b/.test(src), `snippets/${s}: no @import`);
  }
}

/* 2. Fonts: the right warm up, and the font stylesheets freed. */
{
  ok(/font_host == 'https:\/\/fonts\.googleapis\.com'[\s\S]{0,40}<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>/.test(speed), 'speed: fonts.googleapis.com warmed up without crossorigin, fonts.gstatic.com with it');
  const js = between(speed, '<script id="speed-optimization-js">', '</script>');
  ok(/FONT_SHEET = \/\^https:\\\/\\\/fonts\\\.googleapis\\\.com\\\/\//.test(js), 'speed: the font-library stylesheets are recognised');
  ok(/fontObserver\.observe\(document\.head, \{ childList: true \}\)/.test(js), 'speed: <head> is watched as it is read');
  ok(/onReady\(function \(\) \{ fontObserver\.disconnect\(\); \}\)/.test(js), 'speed: the watch ends when the page has been read');
  ok(js.indexOf('freeFont') < js.indexOf('tuneImages'), 'speed: fonts are freed before anything else runs');
  ok(layout.indexOf("render 'speed-optimization'") < layout.indexOf("render 'font-variables'") && layout.indexOf("render 'speed-optimization'") < layout.indexOf('content_for_header'), 'layout: the speed script runs before any font stylesheet is written');
}

/* 3. Pictures. */
{
  ok(/if priority_image == true\s+assign loading = 'eager'\s+assign fetch_priority = 'high'/.test(responsive), 'responsive-image: the priority picture is eager and high');
  ok(/assign loading = 'lazy'\s+assign fetch_priority = 'auto'/.test(responsive), 'responsive-image: every other picture is lazy');
  ok(/if hidden_at_load == true\s+assign loading = 'lazy'\s+assign fetch_priority = 'low'/.test(responsive), 'responsive-image: a picture hidden at load is lazy and low');
  ok(/if priority_image == true\s+assign decoding = 'auto'/.test(responsive) && !/decoding: 'async'/.test(responsive), 'responsive-image: the priority picture decodes with its frame');
  ok(/priority_image: forloop\.first/.test(slideshow), 'slideshow: the first slide is the priority picture');
  ok(/lazy_load: lazy_load,/.test(slideshow), 'slideshow: the others follow the lazy setting');
  for (const f of ['snippets/horizontal-menu.storelib', 'snippets/menu-mobile-banner.storelib', 'snippets/vertical-menu.storelib']) {
    const src = read(f);
    const renders = [...src.matchAll(/\{% render 'responsive-image',([\s\S]*?)%\}/g)];
    ok(renders.length > 0, `${f}: draws menu pictures`);
    for (const r of renders) ok(/hidden_at_load: true/.test(r[1]), `${f}: a closed menu's picture is hidden_at_load`);
  }
  ok(/drawn_desktop: section_st\.logo_width_desktop, drawn_mobile: section_st\.logo_width_mobile/.test(header), 'header: the logo is told the size it is drawn at');
  ok(!/sizes="\(max-width: 1024px\) 300px, 400px"/.test(logo) && (logo.match(/sizes="\{\{ logo_sizes \}\}"/g) || []).length >= 1, 'logo: sizes follow the drawn size');
  ok(/assign logo_sizes = '\(max-width: 1024\.98px\) ' \| append: drawn_mobile/.test(logo), 'logo: phone and desktop sizes from the header');
}

/* 4. Videos wait for the page. */
{
  const videos = [...mediaLayout.matchAll(/<video\b[\s\S]*?><\/video>/g)].map(m => m[0]);
  ok(videos.length >= 2, 'product-media-layout: gallery videos found');
  for (const v of videos) {
    ok(/\bdata-src="\{\{ source_url \}\}"/.test(v) && !/\ssrc=/.test(v), 'product-media-layout: a gallery video carries its file in data-src');
    ok(/preload="none"/.test(v), 'product-media-layout: a gallery video preloads nothing');
  }
  const players = [...slideshow.matchAll(/<(iframe|video)\b[\s\S]*?>/g)].map(m => m[0]).filter(t => /class="slideshow"/.test(t));
  ok(players.length >= 4, 'slideshow: players found');
  for (const t of players) ok(/\bdata-src=/.test(t) && !/\ssrc=/.test(t), `slideshow: ${t.slice(1, 7)} carries its file in data-src`);
  const loader = between(global, 'loadSlideshowVideos() {', '\n  }\n');
  ok(/document\.readyState === "complete"/.test(loader) && /addEventListener\("load", later, \{ once: true \}\)/.test(loader), 'global.js: slideshow videos start after load');
  ok(/:is\(video, iframe\)\[data-src\]/.test(loader), 'global.js: slideshow players (YouTube, Vimeo) too');
}

/* 4b. Work that held the first picture back. */
{
  ok(/init\(\) \{\s*if \(this\.classList\.contains\('slideshow'\)\) \{ SlideSection\.afterFirstPicture\(this, \(\) => this\.initSlideshow\(\)\); return; \}/.test(global), 'global.js: the slideshow starts after its first picture');
  const tabs = read('sections/content-tabs.storelib');
  ok(!/addEventListener\('resize', onResize\);\s*update\(\);/.test(tabs) && /new ResizeObserver\(function \(\) \{ if \(track\.isConnected\) update\(\); \}\)\.observe\(track\)/.test(tabs), 'content-tabs: the arrows are set after layout, not by measuring while the page is read');
  ok(/'motion\.min\.js' \| asset_url \}\}" type="module" defer="defer" fetchpriority="low"/.test(layout), 'layout: the motion library is fetched behind the first picture');
}

/* 5. Nothing in the first screen starts invisible. */
{
  const info = layout.match(/@keyframes materiaInfoIn \{([^}]*\})\s*\}/);
  ok(info && !/opacity/.test(info[1]) && /transform/.test(info[1]), 'layout: the product information rises, never starts invisible');
  const rules = animationCss.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  for (const m of rules.matchAll(/([^{}]+)\{[^{}]*\bopacity:\s*0\s*;/g)) ok(/scroll-trigger--offscreen/.test(m[1]), `animation.css: only what starts below the first screen is hidden (${m[1].trim().slice(0, 60)})`);
}

const delay = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    /* 6. Fonts no longer hold the first paint. */
    const speedJs = between(speed, '<script id="speed-optimization-js">', '</script>').replace(/^<script id="speed-optimization-js">/, '').replace(/<\/script>$/, '').split(NOOP).join('')
      .replace('{{ perf_images | json }}', 'true').replace('{{ perf_motion | json }}', 'true')
      .replace('{{ perf_thirdparty | json }}', 'false').replace('{{ in_editor | json }}', 'false');
    ok(!/\{\{|\{%/.test(speedJs), 'speed script: every value filled for the fixture');
    const fontPage = withScript => `<!doctype html><html><head><meta charset="utf-8">
      ${withScript ? `<script>${speedJs}</script>` : ''}
      <style>body{font:16px/1.4 sans-serif;margin:0}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Test&display=swap" data-storelib-font>
      </head><body><h1 id="t">Fuel your focus</h1><p>First screen text.</p></body></html>`;
    const fcpOf = async withScript => {
      const ctx = await browser.newContext();
      await ctx.route('https://fonts.googleapis.com/**', async route => { await delay(2500); route.fulfill({contentType: 'text/css', body: 'h1{letter-spacing:3px}'}); });
      await ctx.route('http://shop.test/**', route => route.fulfill({contentType: 'text/html', body: fontPage(withScript)}));
      const page = await ctx.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://shop.test/', {waitUntil: 'commit'});
      await page.waitForFunction(() => performance.getEntriesByType('paint').some(p => p.name === 'first-contentful-paint'), null, {timeout: 10000});
      const fcp = await page.evaluate(() => performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint').startTime);
      await page.waitForFunction(() => getComputedStyle(document.getElementById('t')).letterSpacing === '3px', null, {timeout: 10000});
      const state = await page.evaluate(() => ({links: [...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].map(l => l.media || 'all'), freed: !!document.querySelector('link[data-speed-font]')}));
      await ctx.close();
      return {fcp, state, errors};
    };
    const held = await fcpOf(false);
    const freed = await fcpOf(true);
    ok(held.fcp >= 2400, `fixture: a blocking font stylesheet holds the first paint (${Math.round(held.fcp)}ms)`);
    ok(freed.fcp < 1200, `speed script: the first paint no longer waits for the font stylesheet (${Math.round(freed.fcp)}ms)`);
    ok(freed.state.freed && freed.state.links.length === 1 && freed.state.links[0] === 'all', 'speed script: the stylesheet is replaced once and applies when it lands');
    ok(freed.errors.length === 0, `speed script: no errors (${freed.errors.join(' | ')})`);

    /* 7. Gallery videos wait for the page and for the screen. */
    {
      const loaderJs = between(global, '/* Gallery videos (snippets/product-media-layout)', '\n})();\n');
      const ctx = await browser.newContext({viewport: {width: 800, height: 600}});
      await ctx.route('http://shop.test/**', async route => {
        const u = new URL(route.request().url());
        if (u.pathname === '/slow.png') { await delay(1200); return route.fulfill({contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'}); }
        if (u.pathname.endsWith('.webm')) return route.fulfill({contentType: 'video/webm', body: Buffer.alloc(0)});
        route.fulfill({contentType: 'text/html', body: `<!doctype html><html><body style="margin:0">
          <video id="near" class="media-video" data-src="/near.webm" preload="none" muted autoplay playsinline style="display:block;width:300px;height:200px"></video>
          <img src="/slow.png" width="10" height="10" alt="">
          <div style="height:4000px"></div>
          <video id="far" class="media-video" data-src="/far.webm" preload="none" muted autoplay playsinline style="display:block;width:300px;height:200px"></video>
          <video id="tap" class="media-video" data-src="/tap.webm" preload="none" playsinline style="display:block;width:300px;height:200px"></video>
          <script>${loaderJs}</script></body></html>`});
      });
      const page = await ctx.newPage();
      await page.goto('http://shop.test/', {waitUntil: 'domcontentloaded'});
      const early = await page.evaluate(() => ({ready: document.readyState, near: document.getElementById('near').getAttribute('src')}));
      ok(early.ready !== 'complete' && early.near === null, 'gallery video: no file while the page is still loading');
      await page.waitForLoadState('load');
      await page.waitForFunction(() => document.getElementById('near').getAttribute('src') === '/near.webm', null, {timeout: 3000});
      ok(true, 'gallery video: the one in view gets its file after load');
      ok(await page.evaluate(() => document.getElementById('far').getAttribute('src') === null && document.getElementById('far').hasAttribute('data-src')), 'gallery video: one far below waits');
      await page.evaluate(() => document.getElementById('far').scrollIntoView());
      await page.waitForFunction(() => document.getElementById('far').getAttribute('src') === '/far.webm', null, {timeout: 3000});
      ok(true, 'gallery video: it gets its file as it comes near');
      await page.evaluate(() => { const v = document.getElementById('tap'); v.scrollIntoView(); });
      await ctx.close();
      // A tap before load starts it at once.
      const ctx2 = await browser.newContext({viewport: {width: 800, height: 600}});
      await ctx2.route('http://shop.test/**', async route => {
        const u = new URL(route.request().url());
        if (u.pathname === '/slow.png') { await delay(3000); return route.fulfill({contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'}); }
        if (u.pathname.endsWith('.webm')) return route.fulfill({contentType: 'video/webm', body: Buffer.alloc(0)});
        route.fulfill({contentType: 'text/html', body: `<!doctype html><html><body style="margin:0">
          <video id="tap" class="media-video" data-src="/tap.webm" preload="none" playsinline style="display:block;width:300px;height:200px"></video>
          <img src="/slow.png" width="10" height="10" alt=""><script>${loaderJs}</script></body></html>`});
      });
      const page2 = await ctx2.newPage();
      await page2.goto('http://shop.test/', {waitUntil: 'domcontentloaded'});
      await page2.mouse.click(150, 100);
      ok(await page2.evaluate(() => document.readyState !== 'complete' && document.getElementById('tap').getAttribute('src') === '/tap.webm'), 'gallery video: a tap before load starts it at once');
      await page2.evaluate(() => document.getElementById('tap').removeAttribute('src'));
      await ctx2.close();
    }

    /* 7b. The slideshow waits for its first picture, then a frame. */
    {
      const method = between(global, 'static afterFirstPicture(el, start) {', '\n  }\n');
      const ctx = await browser.newContext({viewport: {width: 800, height: 600}});
      await ctx.route('http://shop.test/**', async route => {
        const u = new URL(route.request().url());
        if (u.pathname === '/hero.svg') { await delay(800); return route.fulfill({contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="red"/></svg>'}); }
        if (u.pathname === '/late.svg') { await delay(2500); return route.fulfill({contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"/>'}); }
        route.fulfill({contentType: 'text/html', body: `<!doctype html><html><body>
          <div id="s" class="swiper slideshow"><div class="swiper-wrapper"><div class="swiper-slide"><img id="hero" src="/hero.svg" width="40" height="40" alt=""></div></div></div>
          <img src="/late.svg" width="4" height="4" alt="">
          <script>class T { ${method} }
            window.__events = [];
            new PerformanceObserver(l => { for (const e of l.getEntries()) window.__events.push(['lcp', e.startTime, (e.url || '').split('/').pop()]); }).observe({type: 'largest-contentful-paint', buffered: true});
            T.afterFirstPicture(document.getElementById('s'), () => window.__events.push(['start', performance.now(), document.getElementById('hero').complete]));
          </script></body></html>`});
      });
      const page = await ctx.newPage();
      await page.goto('http://shop.test/', {waitUntil: 'commit'});
      await page.waitForFunction(() => window.__events && window.__events.some(e => e[0] === 'start'), null, {timeout: 5000});
      await page.waitForTimeout(50);
      const ev = await page.evaluate(() => ({events: window.__events, ready: document.readyState}));
      const startE = ev.events.find(e => e[0] === 'start');
      const lcp = ev.events.filter(e => e[0] === 'lcp' && e[2] === 'hero.svg').pop();
      ok(startE[2] === true && ev.ready !== 'complete', 'slideshow: starts once its first picture is in, before the page has finished loading');
      ok(lcp && lcp[1] <= startE[1], `slideshow: the first picture is painted before the slider is built (${lcp && Math.round(lcp[1])} <= ${Math.round(startE[1])})`);
      await ctx.close();
    }

    /* 8. Live: the first picture and the first screen. */
    if (process.env.LIVE !== '0') {
      const ctx = await browser.newContext({viewport: {width: 1366, height: 768}});
      const page = await ctx.newPage();
      await page.addInitScript(() => {
        window.__first = null;
        const look = () => {
          const h = document.querySelector('#MainContent h1, #MainContent h2');
          if (!h) return requestAnimationFrame(look);
          let o = 1; for (let n = h; n && n.nodeType === 1; n = n.parentElement) o *= +getComputedStyle(n).opacity;
          window.__first = o;
        };
        requestAnimationFrame(look);
      });
      await page.goto(process.env.LIVE_URL || 'https://andrewrullz.storelib.com/', {waitUntil: 'load', timeout: 90000});
      await page.waitForTimeout(800);
      const live = await page.evaluate(() => {
        const img = document.querySelector('#MainContent img');
        const fonts = performance.getEntriesByType('resource').filter(r => r.name.includes('fonts.googleapis.com'));
        return {loading: img && img.getAttribute('loading'), priority: img && img.getAttribute('fetchpriority'), first: window.__first, freed: document.querySelectorAll('link[data-speed-font]').length, fonts: fonts.length};
      });
      ok(live.loading !== 'lazy' && live.priority === 'high', `live: the first picture is eager and high (${live.loading}/${live.priority})`);
      ok(live.first === 1, `live: the first heading is painted at full opacity in its first frame (${live.first})`);
      if (live.fonts) ok(live.freed > 0, 'live: the font stylesheets were freed from the first paint');
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`${checks} perf round 5 checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
