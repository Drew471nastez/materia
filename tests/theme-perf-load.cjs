/* Run: node tests/theme-perf-load.cjs
   Work at load: sliders are built only when they come within a screen of the
   viewport (shopify/assets/global.js SlideSection.whenNear, the product
   gallery in theme.js too), never while hidden, each once; a mega menu's
   position is worked out when it is first opened, not for every item at load
   (theme.js initSubMenu/addCssSubMenu). Chromium fixtures load the
   repository's own code; layout reads are counted while the scripts run. */
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

const global = read('shopify/assets/global.js');
const theme = read('shopify/assets/theme.js');
const sliderClass = global.slice(global.indexOf('class SlideSection'), global.indexOf('class PopupBase'));
const gallery = between(theme, 'class SlideWithThumbs', 'customElements.define("slide-with-thumbs", SlideWithThumbs);');
const motion = between(theme, 'function motionAnimate', '\n}\n');
const menu = between(theme, 'function HoverIntent', 'var BlsSearchShopify').replace(/var BlsSearchShopify$/, '');

// Counts layout reads (boxes, offsets, client sizes, scroll position) made
// while a script runs.
const countLayoutReads = () => {
  window.__layoutReads = 0;
  const count = (proto, name) => {
    const d = Object.getOwnPropertyDescriptor(proto, name);
    if (!d) return;
    if (d.get) Object.defineProperty(proto, name, {configurable: true, get() { window.__layoutReads++; return d.get.call(this); }});
    else if (typeof d.value === 'function') proto[name] = function () { window.__layoutReads++; return d.value.apply(this, arguments); };
  };
  ['getBoundingClientRect', 'getClientRects', 'clientWidth', 'clientHeight', 'scrollWidth'].forEach(n => count(Element.prototype, n));
  ['offsetWidth', 'offsetHeight', 'offsetLeft', 'offsetTop'].forEach(n => count(HTMLElement.prototype, n));
  ['innerWidth', 'innerHeight', 'pageYOffset', 'scrollY'].forEach(n => count(Object.getOwnPropertyDescriptor(window, n) ? window : Window.prototype, n));
};

const slides = n => Array.from({length: n}, (_, i) => `<div class="swiper-slide" style="height:120px;background:#ddd">Slide ${i + 1}</div>`).join('');
const slider = (id, extra = '') => `<slide-section id="${id}" class="swiper ${extra}" data-desktop="3" data-tablet="2" data-mobile="1" data-spacing="10"><div class="swiper-wrapper">${slides(5)}</div><div class="swiper-pagination"></div></slide-section>`;
const gallerySlides = cls => [1, 2, 3].map(i => `<div class="swiper-slide ${cls}" style="height:200px;background:#ccd">Picture ${i}</div>`).join('');

(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  let checks = 0;
  try {
    /* Sliders */
    {
      const page = await browser.newPage({viewport: {width: 1280, height: 800}});
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.setContent(`<body class="index" style="margin:0">
        ${slider('top')}
        <div id="tab" hidden>${slider('hidden')}</div>
        <div style="height:3000px"></div>
        ${slider('far')}
        <div style="height:3000px"></div>
        <slide-with-thumbs id="gallery" class="block relative" data-speed="0" data-mobile="1" data-tablet="1" data-desktop="1">
          <div class="media-main-swiper"><div class="swiper-wrapper-preview swiper"><div class="swiper-wrapper">${gallerySlides('media-item')}</div></div></div>
          <div class="media-thumb-swiper"><div class="thumbnail-slide swiper"><div class="swiper-wrapper">${gallerySlides('')}</div></div></div>
        </slide-with-thumbs>
        <div style="height:2000px"></div></body>`);
      await page.addStyleTag({content: read('shopify/assets/swiper-bundle.min.css')});
      await page.addScriptTag({content: read('shopify/assets/swiper-bundle.min.js')});
      await page.evaluate(countLayoutReads);
      // Run as an inline script, read back in the same task.
      const define = await page.evaluate(code => {
        const script = document.createElement('script');
        script.textContent = code;
        document.head.append(script);
        return {reads: window.__layoutReads, built: !!document.querySelector('#top').globalSlide};
      }, sliderClass + '\n' + gallery);
      assert.equal(define.reads, 0, 'defining the sliders reads no layout');
      assert.equal(define.built, false, 'nothing is built while the scripts run');
      checks++;

      await page.waitForFunction(() => document.querySelector('#top').globalSlide, null, {timeout: 3000});
      await page.waitForTimeout(150);
      const state = () => page.evaluate(() => ({
        top: !!document.querySelector('#top').globalSlide,
        far: !!document.querySelector('#far').globalSlide,
        hidden: !!document.querySelector('#hidden').globalSlide,
        gallery: !!document.querySelector('#gallery').globalSlide,
        initialized: document.querySelectorAll('.swiper-initialized').length,
      }));
      let s = await state();
      assert.deepEqual([s.top, s.far, s.hidden, s.gallery], [true, false, false, false], 'only the slider in view is built at load');
      assert.equal(s.initialized, 1);
      assert.equal(await page.$eval('#top', el => el.classList.contains('lazy-loading-swiper-after')), false);
      checks++;

      // Coming within a screen of the viewport builds it, before it is seen.
      const farTop = await page.$eval('#far', el => el.getBoundingClientRect().top + scrollY);
      await page.evaluate(y => scrollTo(0, y), farTop - 800 * 1.9);
      await page.waitForFunction(() => document.querySelector('#far').globalSlide, null, {timeout: 3000});
      assert(await page.$eval('#far', el => el.getBoundingClientRect().top > innerHeight), 'built while still below the screen');
      assert.equal(await page.$eval('#hidden', el => !!el.globalSlide), false, 'a hidden slider waits');
      checks++;

      // In range all along, built only once it is shown.
      await page.evaluate(() => { scrollTo(0, 0); document.getElementById('tab').hidden = false; });
      await page.waitForFunction(() => document.querySelector('#hidden').globalSlide, null, {timeout: 3000});
      checks++;

      // The gallery: built near the viewport, or at once when a script needs it.
      assert.equal(await page.$eval('#gallery', el => !!el.globalSlide), false);
      await page.$eval('#gallery', el => el.functionGoto(2));
      assert(await page.$eval('#gallery', el => !!el.globalSlide && el.globalSlide.activeIndex === 2), 'functionGoto builds a waiting gallery and slides');
      await page.waitForFunction(() => document.querySelector('#gallery').thumbnailSlide, null, {timeout: 3000});
      await page.$eval('#gallery', el => el.scrollIntoView());
      await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => document.querySelectorAll('#gallery .swiper-initialized').length), 2, 'built once: the main slider and its thumbnails');
      checks++;

      // Several reported together are built one per task.
      await page.evaluate(() => {
        const wrap = document.createElement('div');
        wrap.id = 'batch';
        wrap.innerHTML = [1, 2, 3].map(i => `<slide-section id="b${i}" class="swiper" data-desktop="2"><div class="swiper-wrapper"><div class="swiper-slide">A</div><div class="swiper-slide">B</div></div></slide-section>`).join('');
        document.body.prepend(wrap);
        scrollTo(0, 0);
        const seen = [];
        new MutationObserver(() => {
          const now = [...wrap.querySelectorAll('.swiper-initialized')].length;
          seen.push(now);
          window.__seen = seen;
        }).observe(wrap, {subtree: true, attributes: true, attributeFilter: ['class']});
      });
      await page.waitForFunction(() => document.querySelectorAll('#batch .swiper-initialized').length === 3, null, {timeout: 3000});
      const seen = await page.evaluate(() => window.__seen);
      assert(seen.includes(1) && seen.includes(2), 'three sliders arrive one at a time, not in one task');
      assert.deepEqual(errors, []);
      checks++;
      await page.close();
    }

    /* The slideshow still starts at once */
    {
      const page = await browser.newPage({viewport: {width: 1200, height: 800}});
      await page.setContent('<body class="index"><slide-section id="hero" class="slideshow swiper" data-speed="0"><div class="swiper-wrapper"><div class="swiper-slide">One</div><div class="swiper-slide">Two</div></div></slide-section></body>');
      await page.addStyleTag({content: read('shopify/assets/swiper-bundle.min.css')});
      await page.addScriptTag({content: read('shopify/assets/swiper-bundle.min.js')});
      await page.addScriptTag({content: sliderClass});
      assert(await page.$eval('#hero', el => !!el.globalSlide), 'the slideshow is built when defined');
      checks++;
      await page.close();
    }

    /* Mega menu positions */
    {
      const page = await browser.newPage({viewport: {width: 1280, height: 800}});
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.setContent(`<style>body{margin:0}.horizontal-list{display:flex;gap:0;margin:0;padding:0;list-style:none}
        .horizontal-list li{position:static;width:200px}.mega-menu-fix-width{position:absolute;top:60px;width:600px;visibility:hidden;background:#eee}
        .horizontal-list li:hover .mega-menu-fix-width,.horizontal-list li:focus-within .mega-menu-fix-width{visibility:visible}</style>
        <header class="header"><nav class="navigation horizontal"><ul class="horizontal-list">
          <li class="menu-parent"><a href="#a">A</a></li><li class="menu-parent"><a href="#b">B</a></li>
          <li class="menu-parent"><a href="#c">C</a></li><li class="menu-parent"><a href="#d">D</a></li>
          <li class="menu-parent" id="wide"><a href="#e" id="wide-link">E</a><div class="mega-menu-fix-width" id="mega" style="left:1000px">Wide menu</div></li>
        </ul></nav></header><main style="height:2000px"></main>`);
      await page.evaluate(countLayoutReads);
      await page.addScriptTag({content: `var root=document.body;var getScrollBarWidth={init:()=>0};${motion}\n${menu}`});
      await page.evaluate(() => { window.__layoutReads = 0; BlsMainMenuShopify.initSubMenu(); });
      assert.equal(await page.evaluate(() => window.__layoutReads), 0, 'initSubMenu reads no layout');
      assert.equal(await page.$eval('#mega', el => el.style.left), '1000px', 'nothing is positioned at load');
      checks++;

      // The theme's rule: window width - (menu width + left) + left - 30.
      const expected = () => page.evaluate(() => (document.documentElement.clientWidth - 630) + 'px');
      await page.hover('#wide-link');
      assert.equal(await page.$eval('#mega', el => el.style.left), await expected(), 'positioned on first open, inside the window');
      await page.$eval('#mega', el => { el.style.left = '1000px'; });
      await page.hover('a[href="#a"]');
      await page.hover('#wide-link');
      assert.equal(await page.$eval('#mega', el => el.style.left), '1000px', 'worked out once per item');
      await page.setViewportSize({width: 1200, height: 800});
      await page.waitForTimeout(50);
      await page.hover('a[href="#a"]');
      await page.hover('#wide-link');
      assert.equal(await page.$eval('#mega', el => el.style.left), await expected(), 'and again after a resize');
      checks++;

      await page.$eval('#mega', el => { el.style.left = '1000px'; });
      await page.setViewportSize({width: 1280, height: 800});
      await page.waitForTimeout(50);
      await page.mouse.move(5, 700);
      await page.focus('#wide-link');
      assert.equal(await page.$eval('#mega', el => el.style.left), await expected(), 'keyboard focus opens and positions it too');
      assert.deepEqual(errors, []);
      checks++;
      await page.close();
    }

    /* Static: nothing at load waits for the first interaction, and the
       old per-item work at load is gone. */
    {
      const init = between(sliderClass, '  init() {', '\n  }\n');
      assert(init.includes('SlideSection.whenNear(this'), 'generic sliders wait for the viewport');
      assert(!/lazy-loading-swiper-after/.test(init), 'no slider waits for a first mouse move');
      const initSubMenu = between(theme, '    initSubMenu: function () {', '\n    },\n');
      assert(!/this\.addCssSubMenu\(\);/.test(initSubMenu), 'no mega menu is measured at load');
      assert(!/getComputedStyle/.test(between(theme, '    addCssSubMenu: function', '\n    },\n')), 'no computed style per item');
      checks++;
    }
  } finally {
    await browser.close();
  }
  console.log(`${checks} load-work checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
