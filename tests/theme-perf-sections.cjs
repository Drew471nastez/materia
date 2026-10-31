/* Run: node tests/theme-perf-sections.cjs
   Work while the page loads, section by section. Storelib shows a page once
   its HTML is read and the deferred scripts have run, so a layout read in an
   inline script or a DOMContentLoaded handler holds the page back: it forces
   the browser's first layout inside the script.
   - sections/testimonial-video, sections/collection-tab,
     sections/back-to-top-pro and snippets/smooth-media-load read no layout
     while they run; they measure from a ResizeObserver, an
     IntersectionObserver or the next frame, and still do their job.
   - shopify/assets/global.js: Swiper measures a slider again only when its
     box really changed (whole pixels; a horizontal slider by its width).
   - shopify/assets/theme.js: the gallery's thumbnail strip is connected
     without being laid out a second time, and clicking a thumbnail still
     moves the gallery.
   - The product gallery keeps its space: every slide and thumbnail of
     snippets/product-media-layout carries its ratio, and the thumbnail strip
     is drawn at its built size before Swiper builds it
     (shopify/assets/product-page-ui.css). */
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const between = (src, start, end) => {
  const a = src.indexOf(start);
  const b = src.indexOf(end, a);
  assert(a >= 0 && b > a, `markers ${start.slice(0, 40)} / ${end.slice(0, 40)}`);
  return src.slice(a, b + end.length);
};
const NOOP = '{% comment %}{% endcomment %}';
const inlineScript = (file, marker) => {
  const s = [...read(file).matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1].split(NOOP).join('')).find(x => x.includes(marker));
  assert(s, `${file}: script with ${marker}`);
  return s;
};

const global = read('shopify/assets/global.js');
const theme = read('shopify/assets/theme.js');
const swiperJs = read('shopify/assets/swiper-bundle.min.js');
const swiperCss = read('shopify/assets/swiper-bundle.min.css');
const resizeModule = between(global, '// Swiper measures a slider again', '\n})();\n');
const sliderClass = global.slice(global.indexOf('class SlideSection'), global.indexOf('class PopupBase'));
const gallery = between(theme, 'class SlideWithThumbs', 'customElements.define("slide-with-thumbs", SlideWithThumbs);');

// Counts layout reads (boxes, offsets, client and scroll sizes) from here on.
const countLayoutReads = () => {
  window.__layoutReads = 0;
  window.__readStack = [];
  const count = (proto, name) => {
    const d = Object.getOwnPropertyDescriptor(proto, name);
    if (!d) return;
    const note = () => { window.__layoutReads++; if (window.__readStack.length < 3) window.__readStack.push(name); };
    if (d.get) Object.defineProperty(proto, name, {configurable: true, get() { note(); return d.get.call(this); }});
    else if (typeof d.value === 'function') proto[name] = function () { note(); return d.value.apply(this, arguments); };
  };
  ['getBoundingClientRect', 'getClientRects', 'clientWidth', 'clientHeight', 'scrollWidth', 'scrollHeight', 'scrollLeft', 'scrollTop'].forEach(n => count(Element.prototype, n));
  ['offsetWidth', 'offsetHeight', 'offsetLeft', 'offsetTop'].forEach(n => count(HTMLElement.prototype, n));
  ['innerWidth', 'innerHeight', 'pageYOffset', 'scrollY'].forEach(n => count(Object.getOwnPropertyDescriptor(window, n) ? window : Window.prototype, n));
};
// Runs code as an inline script; returns the layout reads it made.
const runInline = (page, code) => page.evaluate(code => {
  window.__layoutReads = 0; window.__readStack = [];
  const s = document.createElement('script');
  s.textContent = code;
  document.body.append(s);
  return {reads: window.__layoutReads, stack: window.__readStack};
}, code);
const frames = (page, n = 3) => page.evaluate(n => new Promise(r => { const step = k => k ? requestAnimationFrame(() => step(k - 1)) : r(); step(n); }), n);

(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  let checks = 0;
  try {
    /* Testimonial video: the rail is measured after layout, and again when it changes */
    {
      const page = await browser.newPage({viewport: {width: 1280, height: 800}});
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      const card = w => `<div class="ctv__card" style="flex:0 0 ${w}px;height:200px;background:#ccc"></div>`;
      await page.setContent(`<body style="margin:0">
        <section id="community-stories-slider-tv"><div data-ctv-viewport style="width:900px">
          <div data-ctv-rail style="display:flex;gap:10px;overflow-x:auto">${card(250).repeat(5)}</div>
          <div data-ctv-progress style="height:4px;background:#eee"><div data-ctv-progress-fill style="height:4px;background:#111"></div></div>
        </div></section></body>`);
      await page.evaluate(countLayoutReads);
      const js = inlineScript('sections/testimonial-video.storelib', "community-stories-slider-' + sid").split('{{ sid }}').join('tv');
      const run = await runInline(page, js);
      assert.equal(run.reads, 0, `testimonial video reads no layout while it starts (read ${run.stack.join(', ')})`);
      checks++;
      await frames(page);
      assert.equal(await page.$eval('[data-ctv-rail]', el => el.classList.contains('is-centered')), false, 'a rail wider than its box scrolls');
      await page.$eval('[data-ctv-rail]', el => { el.scrollLeft = el.scrollWidth; });
      await frames(page);
      assert.equal(await page.$eval('[data-ctv-progress]', el => el.getAttribute('aria-valuenow')), '100', 'the progress bar follows the rail');
      // Cards shrinking until they fit centre the rail, with no window resize.
      await page.$$eval('.ctv__card', els => els.forEach(el => { el.style.flexBasis = '100px'; }));
      await frames(page);
      assert.equal(await page.$eval('[data-ctv-rail]', el => el.classList.contains('is-centered')), true, 'measured again when its cards change size');
      assert.equal(await page.$eval('[data-ctv-viewport]', el => el.classList.contains('is-static')), true);
      assert.deepEqual(errors, []);
      checks++;
      await page.close();
    }

    /* Collection tabs: the open tab is shown in the pill row after layout */
    {
      const page = await browser.newPage({viewport: {width: 400, height: 800}});
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      const pills = active => Array.from({length: 8}, (_, i) => `<button class="ti-tabs__btn${i === active ? ' is-active' : ''}" data-block-id="b${i}" style="flex:0 0 120px">Tab ${i + 1}</button>`).join('');
      const panels = active => Array.from({length: 8}, (_, i) => `<div class="ti-tabs__panel${i === active ? ' is-active' : ''}" data-block-id="b${i}">Panel ${i + 1}</div>`).join('');
      const section = (sid, active) => `<div id="section-${sid}" class="section ti-tabs" data-collection-tab data-ct-animation="none"><div data-ti-tabs><div class="ti-tabs__nav" style="display:flex;overflow-x:auto;width:360px">${pills(active)}</div><div class="ti-tabs__panels">${panels(active)}</div></div></div>`;
      await page.setContent(`<body style="margin:0">${section('first', 0)}${section('later', 6)}</body>`);
      await page.evaluate(countLayoutReads);
      // One cached script (shopify/assets/collection-tab.js) sets up every instance on the page.
      const run = await runInline(page, read('shopify/assets/collection-tab.js'));
      assert.equal(run.reads, 0, `tabs read no layout while they start (read ${run.stack.join(', ')})`);
      checks++;
      await frames(page);
      assert.equal(await page.$eval('#section-first .ti-tabs__nav', el => el.scrollLeft), 0, 'the first tab open: the row stays at its start');
      assert(await page.$eval('#section-later .ti-tabs__nav', el => el.scrollLeft) > 300, 'a later tab open: the row scrolls it into view');
      await page.click('#section-first [data-block-id="b7"]');
      await page.waitForTimeout(600);
      assert(await page.$eval('#section-first .ti-tabs__nav', el => el.scrollLeft) > 300, 'a tapped pill is brought into view');
      assert.equal(await page.$eval('#section-first .ti-tabs__panel.is-active', el => el.dataset.blockId), 'b7');
      assert.deepEqual(errors, []);
      checks++;
      await page.close();
    }

    /* Back to top: no layout read at DOMContentLoaded */
    {
      const page = await browser.newPage({viewport: {width: 1280, height: 800}});
      await page.setContent(`<body style="margin:0"><div style="height:3000px"></div><button class="top-bt" data-back-to-top="bt" data-show-after="300"><svg><path class="progress-path-bt"></path></svg></button></body>`);
      await page.evaluate(() => scrollTo(0, 900));
      await page.evaluate(countLayoutReads);
      let js = inlineScript('sections/back-to-top-pro.storelib', 'data-back-to-top');
      js = js.replace(/\{\{\s*section\.id\s*\|\s*json\s*\}\}/g, '"bt"');
      const run = await runInline(page, js);
      assert.equal(run.reads, 0, `back to top reads no layout while it starts (read ${run.stack.join(', ')})`);
      await frames(page);
      assert.equal(await page.$eval('.top-bt', el => el.classList.contains('is-visible')), true, 'a page opened scrolled down shows it in the next frame');
      checks++;
      await page.close();
    }

    /* Smooth media load: the first screen is found by the browser's own layout */
    {
      const page = await browser.newPage({viewport: {width: 1280, height: 800}});
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.route('https://media.test/**', route => setTimeout(() => route.fulfill({status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'}), 400));
      await page.setContent(`<body style="margin:0"><img id="top" src="https://media.test/a.svg" width="100" height="100"><div style="height:3000px"></div><img id="below" src="https://media.test/b.svg" width="100" height="100"></body>`, {waitUntil: 'domcontentloaded'});
      await page.evaluate(countLayoutReads);
      let js = inlineScript('snippets/smooth-media-load.storelib', 'function firstScan');
      js = js.replace("{{ settings.scroll_animation | default: 'none' | json }}", '"fade"').replace('{{ request.design_mode | json }}', 'false');
      const run = await runInline(page, js);
      assert.equal(run.reads, 0, `smooth media load reads no layout while it starts (read ${run.stack.join(', ')})`);
      checks++;
      await page.waitForFunction(() => document.getElementById('top').complete && document.getElementById('below').complete, null, {timeout: 5000});
      await page.waitForTimeout(50);
      assert.equal(await page.$eval('#top', el => el.classList.contains('media-fade-run')), false, 'a picture in the first screen shows without a fade');
      assert.equal(await page.$eval('#below', el => el.classList.contains('media-fade-run')), true, 'one further down fades in when it arrives');
      assert.deepEqual(errors, []);
      checks++;
      await page.close();
    }

    /* Swiper re-measures only on a real change */
    {
      const page = await browser.newPage({viewport: {width: 1280, height: 800}});
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.setContent(`<body style="margin:0"><div id="box" style="width:591.94px"><div id="s" class="swiper"><div class="swiper-wrapper">${[1, 2, 3].map(i => `<div class="swiper-slide" style="height:200px">${i}</div>`).join('')}</div></div><div id="dots" style="height:0"></div></div></body>`);
      await page.addStyleTag({content: swiperCss});
      await page.addScriptTag({content: swiperJs});
      await page.addScriptTag({content: resizeModule});
      await page.evaluate(() => {
        window.__resizes = 0;
        window.sw = new Swiper('#s', {slidesPerView: 2, spaceBetween: 10, on: {resize: () => window.__resizes++}});
      });
      await frames(page, 4);
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => window.__resizes), 0, 'a slider 591.94px wide is not measured again after it is built');
      await page.$$eval('#s .swiper-slide', els => els.forEach(el => { el.style.height = '260px'; }));
      await frames(page, 4);
      assert.equal(await page.evaluate(() => window.__resizes), 0, 'a horizontal slider growing taller only is not laid out again');
      await page.$eval('#box', el => { el.style.width = '400px'; });
      await frames(page, 4);
      assert.equal(await page.evaluate(() => window.__resizes), 1, 'a real width change is');
      assert.equal(await page.evaluate(() => window.sw.width), 400);
      assert.equal(await page.evaluate(() => Math.round(window.sw.slides[0].getBoundingClientRect().width)), 195, 'slides follow the new width');
      await page.setViewportSize({width: 1000, height: 800});
      await page.$eval('#box', el => { el.style.width = '50%'; });
      await page.setViewportSize({width: 900, height: 800});
      await frames(page, 4);
      assert.equal(await page.evaluate(() => window.sw.width), 450, 'a window resize still reaches Swiper');
      assert.equal(await page.evaluate(() => window.sw.params.resizeObserver), false, "Swiper's own observer is replaced");
      assert.deepEqual(errors, []);
      checks++;
      await page.close();
    }

    /* Product gallery: thumbnails keep their space and connect without a second layout */
    for (const [width, perRow] of [[1366, 6], [412, 5]]) {
      const page = await browser.newPage({viewport: {width, height: 900}});
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      const slide = (cls, i) => `<div class="media-gallery__image ${cls} rounded-5 pointer" data-position="${i}" style="--aspect-ratio: 1/1"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width="1600" height="1600" alt="" style="width:100%;height:auto;position:absolute;inset:0"></div>`;
      const slides = cls => [1, 2, 3, 4, 5, 6, 7].map(i => slide(cls, i)).join('');
      await page.setContent(`<html><head><style>${swiperCss}</style><style>${read('shopify/assets/critical.css')}</style><style>${read('shopify/assets/main-product.css')}</style><style>${read('shopify/assets/product-page-ui.css')}</style></head>
        <body style="margin:0"><div style="width:${width >= 768 ? '591.94px' : '100%'}">
        <slide-with-thumbs id="g" class="block relative" data-effect="slide" data-speed="0" data-mobile="1" data-tablet="1" data-desktop="1" data-thumb-direction="horizontal" data-thumb-slides-per-view="4">
          <div class="media-main-swiper"><div class="swiper-wrapper-preview swiper"><div class="swiper-wrapper">${slides('swiper-slide media-item')}</div></div></div>
          <div class="media-thumb-swiper"><div class="thumbnail-slide swiper mt-10 thumb-bottom" style="--gap: 15px;"><div class="swiper-wrapper">${slides('swiper-slide')}</div></div></div>
        </slide-with-thumbs></div></body></html>`);
      const before = await page.evaluate(() => {
        const strip = document.querySelector('.thumbnail-slide');
        return {strip: strip.getBoundingClientRect().height, thumb: strip.querySelector('.swiper-slide').getBoundingClientRect().width, main: document.querySelector('.swiper-wrapper-preview').getBoundingClientRect().height};
      });
      await page.addScriptTag({content: swiperJs});
      await page.evaluate(() => {
        window.__thumbUpdates = 0; window.__resizes = 0;
        const update = Swiper.prototype.update;
        Swiper.prototype.update = function () { if (this.el && this.el.classList.contains('thumbnail-slide')) window.__thumbUpdates++; return update.apply(this, arguments); };
      });
      await page.addScriptTag({content: resizeModule + '\n' + sliderClass + '\n' + gallery});
      await page.evaluate(() => { const g = document.getElementById('g'); g.ensureStarted(); g.globalSlide.on('resize', () => window.__resizes++); });
      await page.waitForFunction(() => document.getElementById('g').thumbnailSlide, null, {timeout: 3000});
      await page.evaluate(() => document.getElementById('g').thumbnailSlide.on('resize', () => window.__resizes++));
      await frames(page, 4);
      await page.waitForTimeout(100);
      const after = await page.evaluate(() => {
        const g = document.getElementById('g'), strip = g.querySelector('.thumbnail-slide');
        return {strip: strip.getBoundingClientRect().height, thumb: strip.querySelector('.swiper-slide').getBoundingClientRect().width, main: g.querySelector('.swiper-wrapper-preview').getBoundingClientRect().height,
          updates: window.__thumbUpdates, resizes: window.__resizes, connected: g.globalSlide.thumbs.swiper === g.thumbnailSlide, perView: g.thumbnailSlide.params.slidesPerView};
      });
      assert.equal(after.perView, perRow, `${width}px: ${perRow} thumbnails a row`);
      assert(Math.abs(before.thumb - after.thumb) < 0.5, `${width}px: a thumbnail is drawn at its built width before Swiper builds the strip (${before.thumb} / ${after.thumb})`);
      assert(Math.abs(before.strip - after.strip) < 0.5, `${width}px: the strip keeps its height when built (${before.strip} / ${after.strip})`);
      assert(Math.abs(before.main - after.main) < 0.5 && after.main > 300, `${width}px: the gallery keeps its square (${before.main} / ${after.main})`);
      checks++;
      assert.equal(after.connected, true, 'the strip is connected to the gallery');
      assert.equal(after.updates, 0, 'connecting the strip does not lay it out a second time');
      assert.equal(after.resizes, 0, 'nothing is measured again after the gallery and strip are built');
      await page.click('.thumbnail-slide .swiper-slide[data-position="3"]');
      await page.waitForTimeout(100);
      assert.equal(await page.$eval('#g', g => g.globalSlide.activeIndex), 2, 'clicking a thumbnail moves the gallery');
      await page.$eval('#g', g => g.globalSlide.slideTo(4, 0));
      await page.waitForTimeout(50);
      assert.equal(await page.$eval('.thumbnail-slide .swiper-slide-thumb-active', el => el.dataset.position), '5', 'the gallery marks its thumbnail');
      assert.deepEqual(errors, []);
      checks++;
      await page.close();
    }

    /* Static: every slide and thumbnail of the gallery carries its ratio */
    {
      const media = read('snippets/product-media-layout.storelib');
      const tags = [...media.matchAll(/<(a|div)\b((?:[^>{]|\{\{[^}]*\}\}|\{%[^%]*%\})*)>/g)].filter(m => m[2].includes('{{ custom_class }}'));
      assert(tags.length >= 10, 'gallery slides found');
      for (const m of tags) {
        if (m[2].includes('cloudimage-360')) continue; // the 360 viewer draws its own frame
        const line = media.slice(0, m.index).split('\n').length;
        const rest = media.slice(m.index, media.indexOf('{%- when', m.index) > 0 ? media.indexOf('{%- when', m.index) : m.index + 4000);
        assert(m[2].includes('--aspect-ratio') || /\{% else %\}\s*<div class="bls__responsive-image " style="--aspect-ratio/.test(rest), `product-media-layout line ${line}: the slide reserves its ratio`);
      }
      const ratio = media.match(/style="--aspect-ratio: \{\{ media_ratio \| default: ratio \}\}"/g) || [];
      assert(ratio.length >= 10, 'ratios come from the square setting or the media itself');
      // The strip's size before it is built matches what theme.js gives Swiper.
      const thumbs = between(theme, '  initThumbnail() {', '\n  }\n');
      assert(/slidesPerView: 5,/.test(thumbs) && /slidesPerView: direction == "vertical" \? 10 : 6/.test(thumbs) && /: 10;/.test(thumbs), 'theme.js strip: 5 a row, 6 from 768px, 10px apart');
      const css = read('shopify/assets/product-page-ui.css');
      assert(css.includes('width: calc((100% - 4 * 10px) / 5);') && css.includes('width: calc((100% - 5 * 10px) / 6);'), 'product-page-ui.css draws the strip the same before it is built');
      checks++;
    }

    /* Static: none of these scripts measures while the page is read */
    {
      const tv = inlineScript('sections/testimonial-video.storelib', "community-stories-slider-' + sid");
      assert(!/whileHere\(window, 'resize', update\);\s*update\(\);/.test(tv) && tv.includes('new ResizeObserver'), 'testimonial video measures from a ResizeObserver');
      const tabs = read('shopify/assets/collection-tab.js');
      assert(!/<script>[\s\S]*function initTabs/.test(read('sections/collection-tab.storelib')), 'the tabs script is the cached asset, not inline');
      assert(!/[;{]\s*reveal\(/.test(tabs.replace(/function \(\) \{ reveal\(/g, '')), 'tabs measure the row only after layout (inside afterLayout), never right after a click');
      const media = inlineScript('snippets/smooth-media-load.storelib', 'function firstScan');
      assert(!between(media, 'function firstScan', '\n  }\n').includes('getBoundingClientRect'), 'smooth media load leaves measuring to an IntersectionObserver');
      checks++;
    }
  } finally {
    await browser.close();
  }
  console.log(`theme-perf-sections: ${checks} checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
