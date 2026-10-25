const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let passed=0;
 try {
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const markup=q=>`<div id="minicart-form"><form id="minicart"><div class="minicart-body"><div class="items"><div class="cart-item" id="row-a"><input name="updates[]" data-id="a" data-value="${q}" value="${q}" min="0"><mini-cart-remove-button data-index="a"></mini-cart-remove-button><div id="CartDrawer-LineItemError-a"><span class="cart-item__error-text"></span></div></div></div></div></form><span data-cart-subtotal-price>€${q*10}.00</span><button class="btn-checkout">Checkout</button></div>`;
  await page.setContent(`<test-queued-cart id="minicart_wrapper"><div class="minicart__wrapper">${markup(1)}</div></test-queued-cart><free-ship-progress-bar></free-ship-progress-bar>`);
  await page.addStyleTag({content:read('shopify/assets/materia-experience.css')});
  await page.evaluate(()=>{
   window.root=document.documentElement;window.routes={cart_change_url:'/cart/change.js'};window.fetchConfig=()=>({headers:{}});window.BlsLazyloadImg={init(){}};window.cartStrings={error:'Update failed'};
   window.requests=[];window.fetch=(url,config)=>new Promise(resolve=>requests.push({body:JSON.parse(config.body),resolve}));
   window.shipping=[];document.querySelector('free-ship-progress-bar').init=amount=>shipping.push(amount);
  });
  const source=read('shopify/assets/cart-components.js');
  const helpers=source.slice(0,source.indexOf('// theme.js loads this file'));
  const cart=source.slice(source.indexOf('class CartNotification'),source.indexOf('customElements.define("cart-notification"'));
  await page.addScriptTag({content:helpers+cart+`;CartNotification.prototype.cartAction=function(){};CartNotification.prototype.addonsUpdate=function(){};customElements.define('test-queued-cart',CartNotification);`});
  const change=async q=>page.evaluate(q=>{const i=document.querySelector('[name="updates[]"]');i.value=q;i.dispatchEvent(new Event('change',{bubbles:true}));},q);
  await change(2);await page.waitForTimeout(320);
  assert.equal(await page.evaluate(()=>requests.length),1,'a tap reaches the cart after one short grouping window');passed++;
  await change(3);await change(4);
  assert.equal(await page.evaluate(()=>requests.length),1,'quantity changes serialize, not race');
  assert.equal(await page.$eval('input',el=>el.value),'4','latest desired quantity responds immediately');
  assert.equal(await page.evaluate(()=>{const b=document.querySelector('.btn-checkout');let went=false;const go=()=>{went=true;};b.addEventListener('click',go);b.click();b.removeEventListener('click',go);return went;}),false,'checkout waits for pending quantities');passed++;
  await page.evaluate(html=>requests[0].resolve({ok:true,text:async()=>JSON.stringify({item_count:2,items:[],items_subtotal_price:2000,total_price:2000,sections:{'minicart-form':html}})}),markup(2));
  await page.waitForTimeout(360);
  assert.equal(await page.evaluate(()=>requests.length),2);assert.equal(await page.evaluate(()=>requests[1].body.quantity),4,'rapid changes coalesce to the newest quantity');
  assert.equal(await page.$eval('input',el=>el.value),'4','earlier reply cannot overwrite the pending input');
  assert.equal(await page.locator('[data-cart-subtotal-price]').textContent(),'€20.00','prices show only confirmed amounts');passed++;
  await page.evaluate(html=>requests[1].resolve({ok:true,text:async()=>JSON.stringify({item_count:4,items:[],items_subtotal_price:4000,total_price:4000,sections:{'minicart-form':html}})}),markup(4));
  await page.waitForTimeout(900);
  assert.equal(await page.$eval('input',el=>el.value),'4');assert.equal(await page.locator('[data-cart-subtotal-price]').textContent(),'€40.00');
  assert.deepEqual(await page.evaluate(()=>shipping),[2000,4000],'shipping uses the same response, once per confirmed update');
  assert.equal(await page.$eval('test-queued-cart',el=>el.hasAttribute('aria-busy')),false);passed++;
  await change(5);await page.waitForTimeout(320);
  await page.evaluate(()=>requests[2].resolve({ok:true,text:async()=>JSON.stringify({errors:'Only four available'})}));await page.waitForTimeout(50);
  assert.equal(await page.$eval('input',el=>el.value),'4');assert.equal(await page.locator('[data-cart-subtotal-price]').textContent(),'€40.00');passed++;
  assert.deepEqual(errors,[]);
  await page.evaluate(()=>{
   const target=document.querySelector('#minicart-form'),existing=document.querySelector('#row-a');
   const incoming=target.cloneNode(true),added=incoming.querySelector('#row-a').cloneNode(true);added.id='row-b';
   incoming.querySelector('.items').append(added);
   materiaPatchDrawerCart(target,incoming);
   if(document.querySelector('#row-a')!==existing)throw Error('Adding a recommendation rebuilt an existing row');
   if(!document.querySelector('#row-b').getAnimations().length)throw Error('New recommendation row did not animate');
  });passed++;await page.close();

  const carousel=await browser.newPage({viewport:{width:390,height:844}});
  await carousel.setContent('<body class="index"><div id="minicart_wrapper"><slide-section class="swiper swiper-cart-upsell" data-desktop="1" data-tablet="1" data-mobile="1" data-spacing="12"><div class="swiper-wrapper"><div class="swiper-slide">A</div><div class="swiper-slide">B</div><div class="swiper-slide">C</div></div><div class="cart-recommend__nav"><button class="cart-recommend__arrow swiper-button-prev" aria-label="Previous"></button><div class="swiper-pagination"></div><button class="cart-recommend__arrow swiper-button-next" aria-label="Next"></button></div></slide-section></div></body>');
  await carousel.addStyleTag({content:read('shopify/assets/swiper-bundle.min.css')});await carousel.addStyleTag({content:read('shopify/assets/materia-experience.css')});
  await carousel.addScriptTag({content:read('shopify/assets/swiper-bundle.min.js')});
  const global=read('shopify/assets/global.js');await carousel.addScriptTag({content:global.slice(global.indexOf('class SlideSection'),global.indexOf('class PopupBase'))});
  assert(await carousel.$eval('slide-section',el=>!!el.globalSlide),'recommendations initialize without requiring page scroll');
  assert.equal(await carousel.locator('.swiper-button-next').isVisible(),false,'mobile uses swipe, not arrows');
  await carousel.$eval('slide-section',el=>el.globalSlide.slideNext());await carousel.waitForTimeout(450);
  assert.equal(await carousel.$eval('slide-section',el=>el.globalSlide.activeIndex),1);
  await carousel.$eval('slide-section',el=>el.globalSlide.slidePrev());await carousel.waitForTimeout(450);assert.equal(await carousel.$eval('slide-section',el=>el.globalSlide.activeIndex),0);passed++;
  await carousel.setViewportSize({width:1280,height:900});
  assert.equal(await carousel.$eval('.cart-recommend__arrow',el=>el.getBoundingClientRect().width),44);passed++;
  await carousel.locator('.swiper-button-next').click();await carousel.waitForTimeout(450);
  assert.equal(await carousel.$eval('slide-section',el=>el.globalSlide.activeIndex),1,'desktop arrows navigate too');passed++;
  await carousel.close();console.log(`${passed} rapid quantity, confirmed-price and recommendation navigation checks passed`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
