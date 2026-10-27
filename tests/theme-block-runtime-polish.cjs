// Render real shared blocks; browser checks use mocked contact/cart data only.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {engine,PANTS}=require('./theme-featured-product-round5.cjs');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const schema=file=>JSON.parse(read(file).match(/<schema>([\s\S]*?)<\/schema>/)[1]).shopify;
const defaults=block=>Object.fromEntries(block.settings.filter(x=>x.id&&'default'in x).map(x=>[x.id,x.default]));
const e=engine(),render=(file,context)=>e.parseAndRender(read(file).split('\n<schema>')[0].replace(/^<template compat="shopify">/,'').replace(/<\/template>\s*$/,''),context);
const base={settings:{},section:{id:'main'},product:PANTS,page:{product:PANTS},request:{design_mode:true,origin:'https://theme.test'},customer:{},shop:{currency:'USD'}};
const theme='<style>:root{--color-background:#151515;--color-heading:#fafafa;--color-text:#ddd;--color-border:#555;--body-font:Arial;--heading-font:Arial;--body-font-size:16px;--heading-weight:600}*{box-sizing:border-box}body{margin:16px;background:var(--color-background);color:var(--color-text)} .visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}</style>';
(async()=>{let checks=0;
 const main=schema('sections/main-product.storelib'),featured=schema('sections/featured-product.storelib');assert.deepEqual(main.blocks,featured.blocks);checks++;
 const html={};
 for(const type of ['countdown_timer','countdown_badge','infotables','lod_testimonials_block','product_addons']){
  const block=main.blocks.find(b=>b.type===type);assert.deepEqual(schema('blocks/'+type+'.storelib'),block);
  const context={...base,block:{id:'test-'+type,type,settings:defaults(block)}};
  if(type==='countdown_badge')context.block.settings.end_iso=new Date(Date.now()+90061000).toISOString();
  if(type==='countdown_timer')context.block.settings.end_iso=new Date(Date.now()+90061000).toISOString();
  html[type]=await render('blocks/'+type+'.storelib',context);checks++;
 }
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const p=await browser.newPage({viewport:{width:375,height:844}}),errors=[];p.on('pageerror',err=>errors.push(err.message));
  await p.route('https://theme.test/**',route=>{const url=new URL(route.request().url());if(url.pathname.startsWith('/assets/')){const file='shopify/assets/'+path.basename(url.pathname);if(fs.existsSync(path.join(__dirname,'..',file)))return route.fulfill({body:read(file),contentType:file.endsWith('.js')?'application/javascript':'text/css'});}return route.fulfill({body:'<html></html>',contentType:'text/html'});});await p.goto('https://theme.test/');
  await p.setContent(theme+html.countdown_badge+html.countdown_timer+html.infotables+html.lod_testimonials_block);
  await p.addStyleTag({content:read('shopify/assets/product-block-runtime.css')});
  await p.addScriptTag({content:read('shopify/assets/product-block-runtime.js')});
  await p.waitForFunction(()=>document.querySelector('[data-cd=days]').textContent==='01');checks++;
  assert.equal(await p.locator('.cd-card').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(21, 21, 21)');
  assert.equal(await p.locator('[data-cd=hours]').first().textContent(),'01');checks++;await p.screenshot({path:'/tmp/materia-countdown-preview.png',fullPage:true});
  await p.locator('product-countdown-badge').first().evaluate(el=>{el.dataset.end='2000-01-01T00:00:00Z';el.dataset.onEnd='ended';});
  await p.waitForTimeout(50);assert(await p.locator('.cd-ended').isVisible());assert(!await p.locator('.cd-badge .cd-row').isVisible());checks++;
  await p.locator('product-countdown-badge').first().evaluate(el=>{el.dataset.onEnd='restart';el.dataset.restart='3600';});
  await p.waitForTimeout(50);assert(await p.locator('.cd-badge .cd-row').isVisible());checks++;
  await p.locator('product-countdown-badge').first().evaluate(el=>el.dataset.end='');await p.waitForTimeout(40);assert.equal(await p.locator('product-countdown-badge').first().getAttribute('data-invalid'),'true');checks++;
  // A new builder render upgrades without executing its inline scripts again.
  await p.locator('body').evaluate((el,markup)=>el.insertAdjacentHTML('beforeend',markup.replaceAll('test-countdown_badge','redrawn')),html.countdown_badge);
  await p.waitForTimeout(50);assert.equal(await p.locator('#CountdownBadge-redrawn [data-cd=days]').textContent(),'01');checks++;
  assert(await p.locator('[id^=InfoTables]').isVisible());assert.equal(await p.locator('[id^=InfoTables]').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(21, 21, 21)');checks++;
  assert(await p.locator('product-testimonials').isVisible());assert.equal(await p.locator('product-testimonials [data-testimonial-next]').count(),1);assert(!html.lod_testimonials_block.includes('Elias Kern'));checks++;
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
  const v=schema('blocks/variant_selector_pro.storelib');
  const product={...PANTS,options_with_values:[{name:'Size',position:1,values:['S','M','L','XL'],selected_value:'S'},{name:'Color',position:2,values:['Black','Beige'],selected_value:'Black'}]};
  const variant=await render('snippets/variant-selector-pro-render.storelib',{...base,product,block:{id:'compact',settings:{...defaults(v),enable_vsp_custom:true,cols_mobile:2,cols_desktop:4,card_padding:4}}});
  await p.locator('body').evaluate((el,markup)=>el.innerHTML=markup,theme+variant);await p.evaluate(()=>MateriaBlockRuntime.scan());await p.waitForTimeout(60);
  const gap=await p.locator('.vsp__values').first().evaluate(el=>{const a=el.querySelectorAll('.vsp__cell');return a[1].getBoundingClientRect().left-a[0].getBoundingClientRect().right;});assert(gap>=0&&gap<30);checks++;
  await p.screenshot({path:'/tmp/materia-variant-compact.png',fullPage:true});
  for(const width of [375,768,1280]){await p.setViewportSize({width,height:844});await p.waitForTimeout(50);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;}
  await p.locator('body').evaluate((el,markup)=>el.innerHTML=markup,theme+html.product_addons);
  await p.locator('.mt-product-actions > [popovertarget^=Question-]').click();assert(await p.locator('[id^=Question-]').evaluate(el=>el.matches(':popover-open')));assert.equal(await p.locator('[name="contact[body]"]').count(),1);assert.equal(await p.locator('[name="contact[product]"]').inputValue(),PANTS.title);checks++;
  await p.keyboard.press('Escape');await p.locator('[data-product-share]').click();assert(await p.locator('[id^=SharePanel-]').evaluate(el=>el.matches(':popover-open')));checks++;
  await p.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{window.copied=value;}},configurable:true});});await p.locator('[data-copy-product-url]').click();await p.waitForFunction(()=>document.querySelector('[data-copy-status]').textContent.length>0);assert((await p.locator('[data-copy-status]').textContent()).length>0);checks++;
  // Real zero is visible; missing counts are not represented as zero.
  for(const [raw,visible]of [[0,true],[21,true],['',false],['abc0',false]]){const counter=await render('snippets/review-sold-block.storelib',{...base,mode:'sold',product:{id:'p',url:'/products/p',metafields:{custom:{sold_count:raw}}},block:{id:'sold',settings:{sold_source:'product'}}});await p.locator('body').evaluate((el,markup)=>el.innerHTML=markup,counter);assert.equal(await p.locator('.rs__sold').isVisible(),visible);checks++;}
  assert(read('snippets/speed-optimization.storelib').includes('::view-transition-old(root) { display:none;'));checks++;
  assert.deepEqual(errors,[]);checks++;
  await p.close();
  // Actual filter popover stays in the top layer during dismissal; no link click-through.
  const f=await browser.newPage({viewport:{width:375,height:844}});const collection=read('shopify/assets/collection.js');let source=collection.slice(collection.indexOf('(function facets()'),collection.indexOf('/* Materia: the Sort by sheet'));
  await f.setContent('<style>body{margin:0}.facets-panel{background:white}.facets-panel--drawer{width:260px!important}a{position:absolute;right:0;top:50px;width:80px;height:500px}</style><facets-root data-section-id="test"><button data-facets-open popovertarget="panel">Filters</button><div id="panel" class="facets-panel facets-panel--drawer" popover data-facets-panel tabindex="-1"><button popovertarget="panel" popovertargetaction="hide">Close</button></div></facets-root><a href="#product">Product</a>');
  await f.addStyleTag({content:read('shopify/assets/collection-page.css')});await f.addScriptTag({content:source});
  await f.evaluate(()=>{window.productClicks=0;document.querySelector('a').onclick=event=>{event.preventDefault();productClicks++;};});
  await f.locator('[data-facets-open]').click();await f.waitForTimeout(380);await f.mouse.click(350,200);assert.equal(await f.evaluate(()=>productClicks),0);assert(await f.locator('#panel').evaluate(el=>el.matches(':popover-open')&&el.classList.contains('is-closing')));checks++;
  await f.waitForTimeout(380);assert(!await f.locator('#panel').evaluate(el=>el.matches(':popover-open')));assert(!await f.locator('html').evaluate(el=>el.classList.contains('facets-locked')));checks++;
  await f.locator('[data-facets-open]').click();await f.waitForTimeout(380);await f.keyboard.press('Escape');await f.waitForTimeout(380);assert(!await f.locator('#panel').evaluate(el=>el.matches(':popover-open')));checks++;
  await f.close();
  const floating=await browser.newPage({viewport:{width:375,height:844}});
  await floating.setContent('<style>body{margin:0;height:2000px}.footer back-to-top{position:fixed;right:16px}mobile-navigation-bar{position:fixed;bottom:0;height:64px;width:100%}sticky-add-cart{position:fixed;bottom:64px;height:80px;width:100%}</style><div class="footer"><back-to-top>Top</back-to-top></div><sticky-add-cart class="show-sticky-cart"></sticky-add-cart><mobile-navigation-bar></mobile-navigation-bar>');
  await floating.addStyleTag({content:read('shopify/assets/product-block-runtime.css')});await floating.addScriptTag({content:read('shopify/assets/materia-popups.js')});
  await floating.waitForFunction(()=>parseFloat(getComputedStyle(document.querySelector('back-to-top')).bottom)>=156);checks++;
  await floating.locator('body').evaluate(el=>el.insertAdjacentHTML('beforeend','<div id="minicart_wrapper" class="open_drawer"><div class="minicart__wrapper"><div id="shipping" class="cart__addon-content is-open"><div class="addon-actions"><button class="btn-save">Estimate shipping</button><button class="btn-cancel">Cancel</button></div></div></div></div>'));
  await floating.addStyleTag({content:read('shopify/assets/cart-drawer.css')});
  await floating.locator('#shipping').evaluate(el=>{el.style.setProperty('position','relative','important');el.style.setProperty('transform','none','important');el.style.setProperty('width','100%','important');});
  for(const selector of ['.btn-save','.btn-cancel']){const box=await floating.locator('#shipping '+selector).boundingBox();assert(box.height>=44&&box.height<=48);assert.equal(await floating.locator('#shipping '+selector).evaluate(el=>getComputedStyle(el).whiteSpace),'nowrap');checks++;}
  await floating.close();
 }finally{await browser.close();}
 console.log(checks+' block lifecycle, countdown settings, themed previews, compact variants, share/contact, zero counts and filter-dismissal checks passed');
})().catch(error=>{console.error(error);process.exitCode=1});
