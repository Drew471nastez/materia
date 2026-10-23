/* Run: node tests/theme-interactions.cjs
   Chromium fixtures exercise the repository's CSS and interaction code.
   They do not replace Storelib's renderer or a live-site performance test. */
const {chromium} = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox']});
  const page = await browser.newPage({viewport: {width: 1100, height: 800}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let passed = 0;
  try {
    await page.setContent(`<style>:root {--btn-primary-bg-color:#123456;--btn-primary-color:#fff;--btn-primary-hover-bg-color:#c00000;--btn-primary-hover-color:#fff;--btn-secondary-bg-color:#eee;--btn-secondary-color:#222;--btn-secondary-border-color:#222;--btn-secondary-hover-bg-color:#222;--btn-secondary-hover-color:#fff;--btn-border-width:0px;--btn-anim-duration:300ms;} #legacy button:hover{background:red!important;color:yellow!important}</style><body data-btn-style="solid" data-btn-secondary-style="outline" data-btn-hover="slide"><div id="legacy"><button id="primary" data-theme-button="primary" data-button-appearance="solid">Add to cart</button><button id="secondary" data-theme-button="secondary" data-button-appearance="outline"><span>Buy now</span></button></div></body>`);
    await page.addStyleTag({content: read('shopify/assets/theme-button-contract.css')});
    await page.waitForTimeout(350);
    const style = selector => page.$eval(selector, el => {const s=getComputedStyle(el);return {bg:s.backgroundColor,color:s.color,border:s.borderTopWidth,font:s.fontFamily};});
    assert.equal((await style('#primary')).bg, 'rgb(18, 52, 86)');
    assert.equal((await style('#secondary')).bg, 'rgba(0, 0, 0, 0)');
    assert.equal((await style('#secondary')).border, '1px'); passed++;
    await page.hover('#primary');
    await page.waitForTimeout(120);
    assert.equal((await style('#primary')).bg, 'rgb(18, 52, 86)', 'slide must retain resting background');
    const fill = await page.$eval('#primary', el=>({transform:getComputedStyle(el,'::before').transform,isolation:getComputedStyle(el).isolation}));
    assert.equal(fill.isolation, 'isolate');
    const scale = Number(fill.transform.match(/matrix\(([^,]+)/)[1]);
    assert(scale > 0 && scale < 1, 'fill must animate rather than snap'); passed++;
    await page.evaluate(()=>{document.querySelector('#primary').style.setProperty('--mb-hover-bg','#008000');document.body.dataset.btnHover='fade';});
    await page.waitForTimeout(350);
    assert.equal((await style('#primary')).bg,'rgb(0, 128, 0)', 'custom hover colour must survive legacy important rules'); passed++;
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.$eval('#primary',el=>getComputedStyle(el).transitionDuration),'0s'); passed++;
    await page.emulateMedia({reducedMotion:'no-preference'});

    // Actual ProductForm class, with a deliberately delayed Shopify response.
    const theme = read('shopify/assets/theme.js');
    const productForm = theme.slice(theme.indexOf('if (!customElements.get("product-form")) {'), theme.indexOf('// js loadmor product'));
    await page.setContent('<cart-notification class="open_drawer"><div id="minicart-form"></div></cart-notification><product-form data-hide-errors="true"><form><input name="id" value="123"><button type="submit"><span>Add</span></button></form></product-form>');
    await page.evaluate(() => {
      window.PopupBase=class extends HTMLElement{};
      window.routes={cart_add_url:'/cart/add.js'};
      window.fetchConfig=()=>({headers:{}});window.publish=()=>{};
      window.PUB_SUB_EVENTS={cartError:'error',cartUpdate:'update'};
      window.BlsLazyloadImg={init(){}};
      const cart=document.querySelector('cart-notification');
      cart.getSectionsToRender=()=>[{id:'minicart-form'}];cart.setActiveElement=()=>{};cart.cartAction=()=>{};
      window.opens=0;cart.open=()=>{window.opens++;cart.classList.add('open')};
      window.fetch=url=>String(url).includes('/cart/add') ? new Promise(resolve=>{window.resolveAdd=()=>resolve({json:async()=>({id:123,sections:{'minicart-form':'<div id="minicart-form">Updated</div>'}})})}) : Promise.resolve({json:async()=>({item_count:1})});
    });
    await page.addScriptTag({content: productForm});
    await page.locator('button[type=submit]').click();
    assert.equal(await page.evaluate(()=>window.opens),0, 'no premature opening');
    assert(await page.locator('button').evaluate(el=>el.classList.contains('loading')));
    await page.evaluate(()=>window.resolveAdd()); await page.waitForTimeout(80);
    assert.equal(await page.evaluate(()=>window.opens),1);
    assert.equal(await page.locator('button').evaluate(el=>el.classList.contains('loading')),false);
    await page.evaluate(()=>document.querySelector('cart-notification').classList.remove('open'));
    await page.waitForTimeout(650);assert.equal(await page.evaluate(()=>window.opens),1,'closed drawer must stay closed'); passed++;

    await page.setContent('<div class="shopify-section" style="position:sticky;top:0;z-index:12"><div data-sticky-announcement="true" style="height:64px">Shipping</div></div><cart-notification id="minicart_wrapper" class="open_drawer open"><div class="minicart__wrapper" style="position:fixed;right:0;width:400px"></div></cart-notification><div class="overlayminicart"></div><form class="newsletter-form"><input name="contact[email]" type="email" required value="a@example.test"><button type="submit">Subscribe</button></form>');
    await page.addStyleTag({content:read('shopify/assets/theme.css')});
    await page.addStyleTag({content:read('shopify/assets/materia-experience.css')});
    await page.addScriptTag({content:read('shopify/assets/materia-experience.js')});
    await page.evaluate(()=>document.documentElement.classList.add('open-minicart'));
    await page.waitForTimeout(600);
    assert(Number(await page.$eval('.overlayminicart',el=>getComputedStyle(el,'::after').opacity)) > .99);
    assert.equal(await page.$eval('.overlayminicart',el=>getComputedStyle(el,'::after').top),'0px');
    assert.equal(await page.$eval('.minicart__wrapper',el=>getComputedStyle(el).top),'0px');
    assert.equal(await page.$eval('.minicart__wrapper',el=>el.getBoundingClientRect().height),800);
    await page.evaluate(()=>document.documentElement.classList.remove('open-minicart'));await page.waitForTimeout(750);
    assert.equal(await page.$eval('.overlayminicart',el=>getComputedStyle(el,'::after').opacity),'0');passed++;
    await page.evaluate(()=>document.querySelector('form').addEventListener('submit',e=>e.preventDefault()));
    await page.locator('button').click();assert.equal(await page.locator('form').getAttribute('aria-busy'),'true');
    await page.evaluate(()=>{const result=document.createElement('p');result.className='form__message';result.textContent='Confirmed by server';document.querySelector('form').append(result)});
    await page.waitForTimeout(30);assert.equal(await page.locator('form').getAttribute('aria-busy'),null);passed++;
    await page.setContent('<div class="product-detail__information"><div class="product-detail__buy-buttons" data-atc-appearance="theme" data-buy-appearance="outline"><button name="add" class="btn-primary">Add</button><button class="shopify-payment-button__button">Buy</button></div></div>');
    await page.evaluate(()=>{window.__materiaExperienceReady=false});
    await page.addScriptTag({content:read('shopify/assets/materia-experience.js')});
    await page.evaluate(()=>{document.body.dataset.btnStyle='solid';document.body.dataset.btnSecondaryStyle='ghost';document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{settings:{btn_secondary_style:'ghost'}}}));});
    await page.waitForTimeout(40);
    assert.equal(await page.locator('[name=add]').getAttribute('data-button-appearance'),'solid');
    assert.equal(await page.locator('.shopify-payment-button__button').getAttribute('data-button-appearance'),'outline','local secondary override must win');passed++;
    await page.evaluate(()=>{document.querySelector('[data-buy-appearance]').dataset.buyAppearance='theme';document.dispatchEvent(new CustomEvent('storelib:section-load'));});
    assert.equal(await page.locator('.shopify-payment-button__button').getAttribute('data-button-appearance'),'ghost','theme secondary appearance must be inherited');
    assert.equal(await page.locator('[name=add]').getAttribute('data-button-appearance'),'solid','changing secondary must not change primary');passed++;
    // A close during the search-to-cart delay cancels the pending open.
    const cartSource = read('shopify/assets/cart-components.js');
    const cartClass = cartSource.slice(cartSource.indexOf('class CartNotification extends HTMLElement'), cartSource.indexOf('customElements.define("cart-notification"'));
    await page.evaluate(()=>{window.debounce=fn=>fn;window.root=document.documentElement;});
    await page.addScriptTag({content:cartClass+`;CartNotification.prototype.initialize=function(){this.notification=this;this.minicart__wrapper=this.querySelector('.minicart__wrapper');this.onBodyClick=()=>{};};customElements.define('test-cart',CartNotification);`});
    await page.setContent('<test-cart><div class="minicart__wrapper"></div></test-cart>');
    await page.evaluate(()=>{document.documentElement.classList.add('open-search');const cart=document.querySelector('test-cart');cart.open();cart.close();});
    await page.waitForTimeout(600);
    assert.equal(await page.locator('test-cart').evaluate(el=>el.classList.contains('open')),false);passed++;
    // An invalid discount removal must not leave an orphaned spinner.
    await page.setContent('<minicart-discount><form><input name="discount"><button type="submit">Apply</button></form><button class="cart-discount-remove">Remove</button></minicart-discount>');
    await page.addScriptTag({content:read('shopify/assets/cart-discount.js')});
    await page.locator('.cart-discount-remove').click();
    assert.equal(await page.locator('.cart-discount-remove').evaluate(el=>el.classList.contains('loading')),false);passed++;
    const breadcrumb=read('sections/breadcrumb.storelib');
    const breadcrumbCSS=[...breadcrumb.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n')
      .replace(/\{\{ section.id \}\}/g,'crumb').replace(/\{%[\s\S]*?%\}/g,'').replace(/\{\{[\s\S]*?\}\}/g,'16');
    await page.setContent('<style>:root{--color-background:white;--color-text:#222;--color-heading:#222} .shopify-section{isolation:isolate;position:relative} #next{z-index:0;height:400px;background:white}</style><div class="shopify-section" id="shopify-section-crumb"><nav class="bc"><div class="bc__row"><div class="bc__nav"><a class="bc__btn" href="#next">Next<span class="bc__peek">Next product</span></a></div></div></nav></div><div class="shopify-section" id="next">Product</div>');
    await page.addStyleTag({content:breadcrumbCSS});
    await page.evaluate(()=>{const trail=document.createElement('ol');trail.className='bc__trail';trail.textContent='Home / Product';document.querySelector('.bc__row').prepend(trail);});
    await page.hover('.bc__btn');await page.waitForTimeout(250);
    await page.$eval('.bc__peek',el=>el.style.pointerEvents='auto');
    assert(await page.$eval('.bc__peek',el=>{const r=el.getBoundingClientRect();return el===document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)}),'preview must paint over next section');
    await page.locator('.bc__btn').click();assert.equal(await page.evaluate(()=>location.hash),'#next');passed++;
    await page.setViewportSize({width:390,height:844});
    const sheets=read('snippets/cart-drawer-sheets.storelib').match(/<style data-cart-drawer-sheets>([\s\S]*?)<\/style>/)[1];
    await page.setContent('<div id="minicart_wrapper" class="open_drawer"><div class="minicart__wrapper" style="width:390px;height:700px;position:relative"><div id="coupon" class="cart__addon-content is-open"><ul class="cart-discount__codes"><li class="cart-discount__item"><p class="cart-discount-code">DREW</p><button class="cart-discount-remove btn-reset"><svg class="remove-icon"></svg><div class="icon-rotator"></div></button></li></ul></div></div></div>');
    await page.addStyleTag({content:sheets});
    const coupon=await page.$eval('.cart-discount-remove',el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,background:getComputedStyle(el).backgroundColor}));
    assert.equal(coupon.width,44);assert.equal(coupon.height,44);assert.equal(coupon.background,'rgba(0, 0, 0, 0)');passed++;
    // Real nested search-popup markup must remain compact; only its outer
    // panel is fixed. The drawer variant must still cover the full viewport.
    await page.setViewportSize({width:1200,height:800});
    for(const mode of ['popup','basic','drawer']) {
      await page.setContent(`<style>:root{--color-background:white;--color-heading:#222;--color-border:#ccc}body{margin:0}.bls__drawer{visibility:hidden}.open-search .bls__drawer.open{visibility:visible}</style><div id="search-form" class="search__type-${mode} bls__drawer open"><div class="search__type-${mode==='drawer'?'drawer':'popup'}"><div class="container"><div class="search__type-popup-bar"><form action="/search" class="search-modal__form"><input class="search__input" placeholder="Search"><button class="btn-search-close">Close</button></form></div></div></div></div>`);
      await page.addStyleTag({content:read('shopify/assets/search-type-default.css')});
      await page.addStyleTag({content:read('shopify/assets/materia-experience.css')});
      await page.evaluate(()=>document.documentElement.classList.add('open-search'));
      const rect=await page.$eval('#search-form',el=>({height:el.getBoundingClientRect().height,top:getComputedStyle(el).top}));
      assert.equal(rect.top,'0px');
      if(mode==='drawer')assert.equal(rect.height,800);
      else {assert(rect.height<180,mode+' popup must not expand to viewport height');assert.equal(await page.$eval('#search-form > div',el=>getComputedStyle(el).position),'relative');}
      passed++;
    }
    assert(read('sections/slideshow.storelib').includes('data-theme-button="primary"'),'slideshow must opt into tested contract');
    await page.setContent('<style>:root{--btn-border-width:2px;--btn-primary-bg-color:#222;--btn-primary-color:white;--btn-primary-border-color:#000;--btn-secondary-bg-color:#222;--btn-secondary-color:white;--btn-secondary-border-color:#222}#slide .btn-primary{border:0!important}#coupon .btn-cancel{background:#222!important;color:black!important}</style><div id="slide"><a class="btn-primary" data-theme-button="primary">Shop</a></div><div id="coupon"><button class="btn-cancel" data-theme-button="secondary" data-button-appearance="solid"><span>Cancel</span></button></div>');
    await page.addStyleTag({content:read('shopify/assets/theme-button-contract.css')});await page.waitForTimeout(350);
    assert.equal(await page.$eval('#slide a',el=>getComputedStyle(el).borderTopWidth),'2px');
    assert.equal(await page.$eval('#coupon button',el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
    assert.equal(await page.$eval('#coupon span',el=>getComputedStyle(el).color),'rgb(255, 255, 255)');passed++;
    await page.setContent('<style>:root{--product-sticky-top:80px;--sticky-top:80px}.sticky{position:sticky}.product-detail__media{height:1600px}media-gallery{display:block;height:200px}</style><div class="product-detail__media"><media-gallery class="sticky top-30">Gallery</media-gallery></div>');
    await page.addStyleTag({content:read('shopify/assets/product-page-ui.css')});
    await page.evaluate(()=>window.scrollTo(0,250));
    const beforeTop=await page.$eval('media-gallery',el=>el.getBoundingClientRect().top);
    await page.evaluate(()=>document.documentElement.style.setProperty('--sticky-top','0px'));
    assert.equal(await page.$eval('media-gallery',el=>el.getBoundingClientRect().top),beforeTop,'header hide must not change the gallery anchor');passed++;
    await page.route('https://fixture.test/**',route=>route.fulfill({contentType:'text/html',body:'<a data-product-neighbor href="/products/b">Next</a><a data-product-neighbor href="/products/c">Previous</a><a data-product-neighbor href="/cart">Cart</a>'}));
    await page.goto('https://fixture.test/products/a');
    await page.addScriptTag({content:read('shopify/assets/theme-navigation.js')});await page.waitForTimeout(250);
    assert.equal(await page.locator('link[rel=prefetch]').count(),2);
    await page.locator('a').first().hover();await page.waitForTimeout(30);
    assert.equal(await page.locator('link[rel=prefetch]').count(),2,'neighbour prefetch must be deduplicated');passed++;
    assert.deepEqual(errors,[]);
    console.log(`${passed} browser interaction checks passed`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
