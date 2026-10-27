// Actual imported snippets plus browser regressions; API responses are mocked,
// so these checks establish request/UI contracts, not backend persistence.
const fs=require('fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {engine,PANTS}=require('./theme-featured-product-round5.cjs');
const read=f=>fs.readFileSync(f,'utf8'),schema=f=>JSON.parse(read(f).split('<schema>')[1].split('</schema>')[0]).shopify;
const defaults=s=>Object.fromEntries(s.settings.filter(x=>x.id&&'default'in x).map(x=>[x.id,x.default]));
const clean=s=>s.split('\n<schema>')[0].replace(/^<template compat="shopify">/,'').replace(/<\/template>\s*$/,'').replace(/^[ \t]*comment[ \t]*\n[\s\S]*?^[ \t]*endcomment[ \t]*$/gm,'');
const e=engine(),render=(file,ctx)=>e.parseAndRender(clean(read(file)),ctx,{globals:ctx});
(async()=>{let checks=0;const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const defs=defaults(schema('blocks/quantity_offer.storelib'));
 const product={...PANTS,featured_image:'https://images.test/product.png',metafields:{storelib:{offers:{value:{quantityBreaks:[{offerId:'real',tiers:[{quantity:1,freeQuantity:0,label:'One pack'},{quantity:2,freeQuantity:1}]}]}}}}};
 const block={id:'quantity',type:'quantity_offer',settings:{...defs,tier_1_image:'https://images.test/custom.png',tier_1_caption:'Uploaded artwork',tier_1_label:'One pack',tier_1_badge:'Popular',tier_2_enable:false}};
 const ctx={settings:{},request:{design_mode:true},product,section:{id:'main'},block,shop:{currency:'USD',money_format:'${{amount}}'}};
 const html=await render('snippets/product-offers.storelib',ctx);
 const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});await p.route('**/*',r=>r.fulfill({body:'',contentType:'text/html'}));await p.goto('https://theme.test/');
 await p.setContent(html);await p.addStyleTag({content:read('shopify/assets/product-offers.css')});await p.addScriptTag({content:read('shopify/assets/product-offers.js')});
 assert.equal(await p.locator('.po-qty').count(),1);assert.equal(await p.locator('.po-tier').count(),1);checks++;
 assert.equal(new URL(await p.locator('.po-tier__image').getAttribute('src')).pathname,'/custom.png');assert.equal(await p.locator('.po-tier__caption').textContent(),'Uploaded artwork');checks++;
 assert.equal(await p.locator('.po-tier__label').textContent(),'One pack');assert.equal(await p.locator('.po-tier__badge').textContent(),'Popular');checks++;
 await p.locator('storelib-product-offers').evaluate(el=>{el.options.style='image_tiles';el.draw(JSON.parse(el.dataset.offers));});assert.equal(await p.locator('.po-qty').getAttribute('data-style'),'image_tiles');checks++;
 block.settings.tier_source='custom';const custom=await render('snippets/product-offers.storelib',ctx);assert(custom.includes('<quantity-offer'));assert(!custom.includes('<storelib-product-offers'));assert(custom.includes('custom.png'));checks++;
 // Real product testimonial markup, not a simplified overflow fixture.
 const testimonial=schema('blocks/lod_testimonials_block.storelib');
 const tctx={...ctx,block:{id:'testimonial',type:'lod_testimonials_block',settings:{...defaults(testimonial),t1_text:'First',t2_text:'Second',t3_text:'Third'}}};
 const text=await render('blocks/lod_testimonials_block.storelib',tctx);
 await p.setContent(text);await p.addStyleTag({content:read('shopify/assets/product-block-runtime.css')});await p.addScriptTag({content:read('shopify/assets/product-block-runtime.js')});
 const row=p.locator('[data-testimonial-row]');assert.equal(await row.evaluate(el=>getComputedStyle(el).overflowX),'auto');checks++;
 const box=await row.boundingBox(),cdp=await p.context().newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+300,y:box.y+60}]});
 for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+300-i*15,y:box.y+60}]});await p.waitForTimeout(16);}
 assert(await row.evaluate(el=>el.scrollLeft>70));await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});checks++;
 await row.evaluate(el=>el.scrollLeft=0);await p.mouse.move(box.x+300,box.y+60);await p.mouse.down();await p.mouse.move(box.x+140,box.y+60,{steps:12});await p.waitForTimeout(35);assert(await row.evaluate(el=>el.scrollLeft>100));await p.mouse.up();checks++;
 await p.close();
 for(const design of [false,true]){
  const page=await browser.newPage({viewport:{width:390,height:844}});await page.route('**/*',r=>r.fulfill({body:'',contentType:'text/html'}));await page.goto('https://theme.test/');
  await page.setContent('<style>:root{--color-background:#181818;--color-text:#eee;--color-heading:#fff;--color-border:#555}body{height:3000px}</style><div style="height:800px"></div><button id="ask" popovertarget="question">Ask</button><div id="question" class="mt-product-dialog" popover><form action="/contact#question" data-storelib-form="contact" data-mt-inline-contact><input name="form_type" type="hidden" value="contact"><span data-mt-words hidden data-success-message="Message received"></span><input name="contact[email]" type="email" required value="buyer@example.test"><textarea name="contact[body]" required>Does this fit?</textarea><button type="submit"><span data-inline-label>Send</span></button></form></div>');
  await page.addStyleTag({content:read('shopify/assets/product-block-runtime.css')});await page.addStyleTag({content:read('shopify/assets/materia-forms.css')});
  await page.addScriptTag({content:read('snippets/section-link-capture.storelib').match(/<script>([\s\S]*?)<\/script>/)[1]});
  await page.evaluate(design=>{window.Shopify={designMode:design};window.sent=[];window.nativeSubmits=0;window.fail=true;window.fetch=async(url,opts)=>{sent.push({url,fields:[...opts.body]});return {ok:!fail,json:async()=>fail?{ok:false,message:'Temporarily unavailable'}:{ok:true}};};addEventListener('submit',event=>{nativeSubmits++;event.preventDefault();},true);},design);
  await page.addScriptTag({content:read('shopify/assets/product-dialogs.js')});await page.addScriptTag({content:read('shopify/assets/materia-forms.js')});
  await page.locator('#ask').click();await page.waitForTimeout(350);const before=await page.evaluate(()=>scrollY);if(design)await page.screenshot({path:'/tmp/materia-question-inline-mobile.png'});
  await page.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('form').dataset.state==='error');
  assert.equal(await page.evaluate(()=>scrollY),before);assert.equal(await page.locator('textarea').inputValue(),'Does this fit?');assert(await page.locator('#question').evaluate(el=>el.matches(':popover-open')));checks++;
  assert.equal(await page.evaluate(()=>nativeSubmits),0);assert((await page.locator('[data-inline-result]').textContent()).includes('unavailable'));checks++;
  await page.evaluate(()=>fail=false);await page.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('form').dataset.state==='done');assert.equal(await page.locator('[data-inline-result]').getAttribute('role'),'status');assert.equal(await page.evaluate(()=>sent.length),2);assert.equal(await page.evaluate(()=>new URL(sent[0].url).hash),'');checks++;
  await page.locator('body').evaluate((el,design)=>el.innerHTML='<form action="/contact" data-storelib-form="subscribe" '+(design?'':'data-mt-inline-subscribe')+'><input type="hidden" name="form_type" value="customer"><input type="email" name="contact[email]" value="news@example.test" required><button type="submit">Subscribe</button></form>',design);
  await page.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('form').dataset.state==='done');assert.equal(await page.evaluate(()=>sent.length),3);checks++;
  await page.close();
 }
 // Password page with the global bottom-navigation reservation and empty footer.
 const page=await browser.newPage({viewport:{width:390,height:844}});await page.setContent('<style>body{margin:0;padding-bottom:130px!important}main{padding-bottom:90px}main>.shopify-section{margin-bottom:90px}</style><main id="MainContent"><div class="shopify-section" style="margin:0"><section class="pw-launch" data-password-launch data-fill-screen="true"><div class="pw-launch__content">Opening soon</div></section></div></main><footer><div class="shopify-section"><style>.empty{color:red}</style></div></footer>');
 await page.addStyleTag({content:read('shopify/assets/password-launch.css')});await page.addScriptTag({content:read('shopify/assets/password-launch.js')});
 assert.equal(await page.evaluate(()=>getComputedStyle(document.body).paddingBottom),'0px');assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight),844);checks++;
 await page.close();
 console.log(checks+' offer presentation, actual testimonial markup, inline contact/newsletter and full-page password gap checks passed');
}finally{await browser.close();}})().catch(err=>{console.error(err);process.exitCode=1;});
