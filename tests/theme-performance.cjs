/* Repository-code browser fixtures, not a live Storelib speed measurement. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  let passed=0;
  try {
    const page=await browser.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const cart=read('shopify/assets/cart-components.js');
    await page.setContent('<main></main>');
    await page.evaluate(()=>{
      window.requests=[];
      window.fetch=url=>new Promise(resolve=>requests.push({url,resolve}));
    });
    await page.addScriptTag({content:cart.slice(cart.indexOf('class BaseFetcher'),cart.indexOf('class CartUpsellHeading'))});
    await page.evaluate(()=>document.body.innerHTML='<minicart-recommendations data-url="/recommend/a"><h2>You may also like</h2><slide-section><div class="swiper-wrapper"></div></slide-section></minicart-recommendations><minicart-recommendations-beside data-url="/recommend/a"><h2>More</h2><div class="cart-upsell-wrapper"></div></minicart-recommendations-beside>');
    assert.equal(await page.evaluate(()=>requests.length),1,'inside/beside share one network request');
    assert.equal(await page.locator('[hidden]').count(),2,'no empty recommendation heading while pending');
    await page.evaluate(()=>requests[0].resolve({ok:true,text:async()=>'<div class="swiper-wrapper"><div class="swiper-slide">Product</div></div><div class="cart-upsell-wrapper"><div class="cart-upsell-item">Product</div></div>'}));
    await page.waitForTimeout(40);
    assert.equal(await page.locator('[hidden]').count(),0);
    assert.equal(await page.locator('minicart-recommendations .swiper-slide').count(),1);passed++;
    await page.evaluate(()=>{
      const rec=document.querySelector('minicart-recommendations');rec.init();
      rec.dataset.url='/recommend/old';rec.init();
      rec.dataset.url='/recommend/new';rec.init();
      requests[2].resolve({ok:true,text:async()=>'<div class="swiper-wrapper"><div class="swiper-slide">Newest</div></div>'});
    });
    await page.waitForTimeout(30);
    await page.evaluate(()=>requests[1].resolve({ok:true,text:async()=>'<div class="swiper-wrapper"><div class="swiper-slide">Stale</div></div>'}));
    await page.waitForTimeout(30);
    assert.equal(await page.locator('minicart-recommendations .swiper-wrapper').textContent(),'Newest','stale response must not overwrite new lead product');passed++;
    await page.evaluate(()=>{
      const rec=document.querySelector('minicart-recommendations');rec.dataset.url='/recommend/empty';rec.init();
      requests[3].resolve({ok:true,text:async()=>'<div class="swiper-wrapper"> <!-- no products --> </div>'});
    });
    await page.waitForTimeout(30);
    assert(await page.locator('minicart-recommendations').evaluate(el=>el.hidden),'empty results hide the whole heading and carousel');passed++;
    assert.deepEqual(errors,[]);await page.close();

    const source=read('shopify/assets/global.js');
    const sliderClass=source.slice(source.indexOf('class SlideSection'),source.indexOf('class PopupBase'));
    const section=read('sections/slideshow.storelib');
    const wire=[...section.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(m=>m[1].includes('__materiaSwipe'))[1]
      .replace(/\{\{ section.id \}\}/g,'fixture').replace(/\{%[\s\S]*?%\}/g,'');
    for(const mobile of [false,true]) {
      const context=await browser.newContext({viewport:{width:mobile?390:1200,height:800},hasTouch:mobile,isMobile:mobile});
      const p=await context.newPage();const slideErrors=[];p.on('pageerror',e=>slideErrors.push(e.message));
      await p.setContent('<style>body{margin:0}.slideshow{height:350px;width:100%}.swiper-slide{background:#ddd}.swiper-slide:nth-child(2){background:#acf}</style><body class="index"><slide-section id="swiper-fixture" class="slideshow swiper" data-desktop="1" data-tablet="1" data-mobile="1" data-effect="creative" data-loop="true" data-speed="180" data-spacing="0"><div class="swiper-wrapper"><div class="swiper-slide"><p>One</p></div><div class="swiper-slide"><p>Two</p></div><div class="swiper-slide"><p>Three</p></div></div></slide-section></body>');
      await p.addStyleTag({content:read('shopify/assets/swiper-bundle.min.css')});
      await p.addStyleTag({content:read('shopify/assets/slideshow.css')});
      await p.addScriptTag({content:read('shopify/assets/swiper-bundle.min.js')});
      await p.addScriptTag({content:sliderClass});await p.addScriptTag({content:wire});
      assert(await p.$eval('slide-section',el=>!!el.globalSlide),'hero initializes without waiting for a scroll');
      const cdp=mobile?await context.newCDPSession(p):null;
      const swipe=async(back=false)=>{
        const start=back?45:(mobile?340:1000),end=back?(mobile?340:1000):45;
        if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start,y:170}]});
        else {await p.mouse.move(start,170);await p.mouse.down();}
        for(let i=1;i<=12;i++){
          const x=start+(end-start)*i/12;
          if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:170}]});
          else await p.mouse.move(x,170);
          await p.waitForTimeout(10);
        }
        if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await p.mouse.up();
        await p.waitForTimeout(330);
      };
      await swipe();
      assert.equal(await p.$eval('slide-section',el=>el.globalSlide.realIndex),1,'swipe lands on exactly the next slide');
      await swipe(true);
      assert.equal(await p.$eval('slide-section',el=>el.globalSlide.realIndex),0,'reverse swipe returns accurately');
      assert.equal(await p.$eval('slide-section',el=>el.classList.contains('is-dragging')),false);
      assert.equal(await p.$eval('.swiper-slide-active',el=>getComputedStyle(el).opacity),'1');
      assert.deepEqual(slideErrors,[]);passed++;await context.close();
    }
    const headerPage=await browser.newPage({viewport:{width:1200,height:800}});
    const headerErrors=[];headerPage.on('pageerror',e=>headerErrors.push(e.message));
    const header=read('snippets/header-sticky-controller.storelib');
    const headerCSS=header.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/\{\{ section.id \}\}/g,'fixture').replace(/\{%[\s\S]*?%\}/g,'');
    await headerPage.setContent('<style>body{margin:0}#bar{position:sticky;top:0;height:40px}#shopify-section-fixture>header{height:80px}main{height:2500px}</style><div id="bar" class="shopify-section"><div data-sticky-announcement="true" style="height:40px">Shipping</div></div><div class="shopify-section section-header" id="shopify-section-fixture"><header class="header" data-sticky="on-scroll-up"></header></div><main>Content</main>');
    await headerPage.addStyleTag({content:headerCSS});
    await headerPage.addScriptTag({content:header.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/\{%[\s\S]*?%\}/g,'')});
    await headerPage.waitForTimeout(80);
    await headerPage.evaluate(()=>scrollTo(0,400));await headerPage.waitForTimeout(100);
    assert(await headerPage.$eval('.section-header',el=>el.classList.contains('shopify-section-header-hidden')));
    const leaving=await headerPage.$eval('.section-header',el=>new DOMMatrix(getComputedStyle(el).transform).m42);
    assert(leaving<0&&leaving>-120,'hide motion must have intermediate frames rather than jump');
    await headerPage.waitForTimeout(550);
    await headerPage.evaluate(()=>scrollTo(0,394));await headerPage.waitForTimeout(50);
    assert(await headerPage.$eval('.section-header',el=>el.classList.contains('shopify-section-header-hidden')),'tiny scroll reversal must not bounce header');
    await headerPage.evaluate(()=>scrollTo(0,375));await headerPage.waitForTimeout(50);
    assert.equal(await headerPage.$eval('.section-header',el=>el.classList.contains('shopify-section-header-hidden')),false);
    assert.deepEqual(headerErrors,[]);passed++;await headerPage.close();

    const nav=await browser.newPage({viewport:{width:390,height:844}});
    await nav.route('https://fixture.test/**',r=>r.fulfill({contentType:'text/html',body:'<mobile-navigation-bar><a id="go" href="/collections/all">Shop</a><a id="same" href="#details">Details</a></mobile-navigation-bar><button class="product-form__submit"><svg class="icon-load"></svg></button>'}));
    await nav.goto('https://fixture.test/products/a');
    await nav.addStyleTag({content:read('shopify/assets/materia-experience.css')});
    await nav.addScriptTag({content:read('shopify/assets/materia-experience.js')});
    await nav.evaluate(()=>document.addEventListener('click',e=>e.preventDefault()));
    await nav.locator('#go').click();
    assert(await nav.locator('#go').evaluate(el=>el.hasAttribute('data-nav-pending')));
    await nav.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
    assert.equal(await nav.locator('#go').evaluate(el=>el.hasAttribute('data-nav-pending')),false);
    await nav.locator('#same').click();
    assert.equal(await nav.locator('#same').evaluate(el=>el.hasAttribute('data-nav-pending')),false);passed++;
    assert.equal(await nav.$eval('.icon-load',el=>getComputedStyle(el).display),'none');
    await nav.evaluate(()=>{document.querySelector('button').classList.add('loading');document.documentElement.classList.add('open-minicart');});
    assert.equal(await nav.$eval('.icon-load',el=>getComputedStyle(el).display),'none','cart opening must not leave an icon on the purchase button');passed++;
    await nav.close();
    console.log(`${passed} recommendation, swipe, header and navigation checks passed`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
