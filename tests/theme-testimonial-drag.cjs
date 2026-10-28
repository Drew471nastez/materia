const fs=require('fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {engine,PANTS}=require('./theme-featured-product-round5.cjs');
const read=f=>fs.readFileSync(f,'utf8'),g=read('shopify/assets/global.js');
const start=g.lastIndexOf('(() => {',g.indexOf('window.__materiaMouseDrag'));
const drag=g.slice(start,g.indexOf('\n})();',start)+5);
const schema=JSON.parse(read('blocks/lod_testimonials_block.storelib').split('<schema>')[1].split('</schema>')[0]).shopify;
const defs=Object.fromEntries(schema.settings.filter(x=>x.id&&'default'in x).map(x=>[x.id,x.default]));
const clean=s=>s.split('<schema>')[0].replace(/^<template compat="shopify">/,'').replace(/<\/template>\s*$/,'');
(async()=>{let checks=0;const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const width of [390,1366]){
  const p=await browser.newPage({viewport:{width,height:900},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.fulfill({contentType:'text/html',body:''}));await p.goto('https://theme.test/');
  const ctx={settings:{},request:{design_mode:true},product:PANTS,section:{id:'main'},block:{id:'review',type:'lod_testimonials_block',settings:{...defs,t1_text:'First review',t2_text:'Second review',t3_text:'Third review'}}};
  const html=await engine().parseAndRender(clean(read('blocks/lod_testimonials_block.storelib')),ctx,{globals:ctx});
  await p.setContent('<style>body{margin:0}[data-testimonial-row]{max-width:375px!important}</style>'+html);
  await p.addStyleTag({content:read('shopify/assets/product-block-runtime.css')});await p.addScriptTag({content:read('shopify/assets/product-block-runtime.js')});await p.addScriptTag({content:drag});
  const row=p.locator('[data-testimonial-row]');await row.evaluate(el=>{el.firstElementChild.insertAdjacentHTML('afterbegin','<a href="/test" data-drag-link><img src="data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\"/%3E" width="90" height="60" alt="Review photo"></a>');el.style.setProperty('scroll-snap-type','x mandatory','important');el.style.setProperty('scroll-behavior','smooth');el.style.setProperty('user-select','text');window.linkClicks=0;document.addEventListener('click',e=>{if(e.target.closest('[data-drag-link]')){e.preventDefault();linkClicks++;}});});
  const box=await row.boundingBox(),x=box.x+280,y=box.y+60;
  await p.mouse.move(x,y);await p.mouse.down();
  let previous=0;for(let i=1;i<=12;i++){await p.mouse.move(x-i*8,y);const position=await row.evaluate(el=>el.scrollLeft);assert(position>previous,'the row must keep moving at every step while held');previous=position;}checks++;
  // Native browser picture dragging must not cancel the mouse gesture.
  assert(await row.evaluate(el=>{const e=new DragEvent('dragstart',{bubbles:true,cancelable:true});el.querySelector('img').dispatchEvent(e);return e.defaultPrevented;}));checks++;
  // Overshoot the start, then reverse by 8px: no accumulated dead zone.
  await p.mouse.move(x+500,y);assert.equal(await row.evaluate(el=>el.scrollLeft),0);await p.mouse.move(x+492,y);assert((await row.evaluate(el=>el.scrollLeft))>=7);checks++;
  await p.mouse.up();assert.equal(await row.evaluate(el=>el.style.getPropertyValue('scroll-snap-type')),'x mandatory');assert.equal(await row.evaluate(el=>el.style.getPropertyPriority('scroll-snap-type')),'important');assert.equal(await row.evaluate(el=>el.style.scrollBehavior),'smooth');assert.equal(await row.evaluate(el=>el.style.userSelect),'text');checks++;
  await row.evaluate(el=>{el.style.scrollSnapType='none';el.style.scrollBehavior='auto';el.scrollLeft=0;});
  const link=p.locator('[data-drag-link]');await link.click();assert.equal(await p.evaluate(()=>linkClicks),1);checks++;
  const lb=await link.boundingBox();await p.mouse.move(lb.x+60,lb.y+20);await p.mouse.down();await p.mouse.move(lb.x+20,lb.y+20,{steps:8});assert(await row.evaluate(el=>el.scrollLeft>=35));await p.mouse.up();assert.equal(await p.evaluate(()=>linkClicks),1,'dragging a linked photo must not navigate');checks++;
  await row.evaluate(el=>el.scrollLeft=0);await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x-40,y);await p.evaluate(()=>window.dispatchEvent(new Event('blur')));assert(!(await row.evaluate(el=>el.classList.contains('is-dragging'))));await p.mouse.up();checks++;
  // Touch remains native scrolling, not a mouse emulation handler.
  await row.evaluate(el=>el.scrollLeft=0);const cdp=await p.context().newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-i*12,y}]});assert(await row.evaluate(el=>el.scrollLeft>40));await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});checks++;
  // The other testimonial sections use real Swiper transform tracks.
  // Verify the native-scroll handler leaves those gestures to Swiper.
  await p.addStyleTag({content:read('shopify/assets/swiper-bundle.min.css')});await p.addScriptTag({content:read('shopify/assets/swiper-bundle.min.js')});
  await p.addScriptTag({content:g.slice(g.indexOf('(() => {'),g.indexOf('\n})();')+5)});
  await p.locator('body').evaluate(body=>body.insertAdjacentHTML('beforeend','<div class="swiper testimonials-slider" style="width:350px"><div class="swiper-wrapper"><div class="swiper-slide" style="height:200px">First testimonial</div><div class="swiper-slide" style="height:200px">Second testimonial</div><div class="swiper-slide" style="height:200px">Third testimonial</div></div></div>'));
  await p.evaluate(()=>window.testimonialSwiper=new Swiper('.testimonials-slider',{slidesPerView:1,speed:0,loop:false}));
  const slider=p.locator('.testimonials-slider');await slider.scrollIntoViewIfNeeded();const sb=await slider.boundingBox();await p.mouse.move(sb.x+260,sb.y+80);await p.mouse.down();await p.mouse.move(sb.x+200,sb.y+80,{steps:4});const halfway=await p.evaluate(()=>testimonialSwiper.translate);assert(halfway < -40);await p.mouse.move(sb.x+140,sb.y+80,{steps:4});assert(await p.evaluate(previous=>testimonialSwiper.translate<previous-40,halfway));await p.mouse.up();checks++;
  assert.equal(await p.evaluate(()=>testimonialSwiper.params.followFinger),true);assert.equal(await p.evaluate(()=>testimonialSwiper.params.simulateTouch),true);checks++;
  assert.deepEqual(errors,[]);await p.close();
 }
 console.log(checks+' actual testimonial row real-time drag, edge reversal, image/link, cleanup, style restoration and native-touch checks passed');
}finally{await browser.close();}})().catch(err=>{console.error(err);process.exitCode=1});
