const fs=require('fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {engine,PANTS}=require('./theme-featured-product-round5.cjs');
const read=f=>fs.readFileSync(f,'utf8');
const clean=s=>s.split('\n<schema>')[0].replace(/^<template compat="shopify">/,'').replace(/<\/template>\s*$/,'').replace(/^[ \t]*comment[ \t]*\n[\s\S]*?^[ \t]*endcomment[ \t]*$/gm,'');
const e=engine(),render=ctx=>e.parseAndRender(clean(read('snippets/product-offers.storelib')),ctx,{globals:ctx});
const schema=JSON.parse(read('blocks/quantity_offer.storelib').split('<schema>')[1].split('</schema>')[0]).shopify;
const defaults=Object.fromEntries(schema.settings.filter(x=>x.id&&'default'in x).map(x=>[x.id,x.default]));
const saved=Object.values(JSON.parse(read('templates/home.json')).sections).flatMap(s=>Object.values(s.blocks||{})).find(b=>b.type==='quantity_offer'&&b.settings.tier_1_image);
assert(saved,'Use the creator’s actual saved Quantity Offer settings');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFooAAAAASUVORK5CYII=','base64');
(async()=>{let checks=0;const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const width of [390,1366])for(const source of ['custom','store']){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.route('**/*',route=>/\.(png|jpe?g)(?:\?|$)/i.test(route.request().url())?route.fulfill({body:png,contentType:'image/png'}):route.fulfill({body:'',contentType:'text/html'}));await page.goto('https://theme.test/');
  const settings={...defaults,...saved.settings,tier_source:source};
  const ctx={settings:{},request:{design_mode:true},shop:{currency:'USD',money_format:'${{amount}}'},section:{id:'featured'},block:{id:'quantity',type:'quantity_offer',settings},product:{...PANTS,featured_image:'https://images.test/product.png',metafields:{storelib:{offers:{value:{quantityBreaks:[{offerId:'real',tiers:[{quantity:1},{quantity:2},{quantity:3}]}]}}}}}};
  const html=await render(ctx);await page.setContent('<div id="shopify-section-featured" class="shopify-section"><div id="gallery">Product gallery</div>'+html+'</div>');
  await page.addStyleTag({content:read('shopify/assets/product-offers.css')});await page.addScriptTag({content:read('shopify/assets/product-offers.js')});
  const root=page.locator(source==='store'?'storelib-product-offers':'quantity-offer');
  const image=n=>root.locator('[data-tier-index="'+n+'"] .po-tier__image');
  for(const n of [1,3]){await image(n).waitFor();await image(n).evaluate(img=>img.decode());assert.equal(new URL(await image(n).getAttribute('src')).pathname,new URL(saved.settings['tier_'+n+'_image']).pathname);assert(await image(n).evaluate(img=>img.naturalWidth>0));checks++;}
  const first=await root.elementHandle();await page.evaluate(()=>window.originalGallery=document.querySelector('#gallery'));
  await root.locator('.po-tier__radio').nth(1).check({force:true});const checked=await root.locator('.po-tier__radio:checked').inputValue();
  // Change image JSON in-place, exactly the lifecycle missing in the old runtime.
  await root.evaluate(el=>{const s=JSON.parse(el.dataset.options);s.tier_1_image={url:'https://images.test/replacement.png',alt:'Replacement'};el.dataset.options=JSON.stringify(s);});
  await page.waitForFunction(()=>document.querySelector('[data-tier-index="1"] .po-tier__image')?.src==='https://images.test/replacement.png');await image(1).evaluate(img=>img.decode());assert.equal(await image(1).getAttribute('alt'),'Replacement');checks++;
  await root.evaluate(el=>{const s=JSON.parse(el.dataset.options);s.tier_1_image=null;el.dataset.options=JSON.stringify(s);});await page.waitForFunction(()=>!document.querySelector('[data-tier-index="1"] .po-tier__image'));checks++;
  // Direct image attribute patches, including removal, must beat stale JSON.
  await root.evaluate(el=>el.setAttribute('data-tier-image-1','https://images.test/attribute.png'));await page.waitForFunction(()=>document.querySelector('[data-tier-index="1"] .po-tier__image')?.src==='https://images.test/attribute.png');checks++;
  await root.evaluate(el=>el.setAttribute('data-tier-image-1',''));await page.waitForFunction(()=>!document.querySelector('[data-tier-index="1"] .po-tier__image'));checks++;
  await page.evaluate(()=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{section:'featured',blockId:'quantity',settings:{tier_1_image:'https://images.test/event.png'}}})));
  await page.waitForFunction(()=>document.querySelector('[data-tier-index="1"] .po-tier__image')?.src==='https://images.test/event.png');checks++;
  assert.equal(await root.locator('.po-tier__radio:checked').inputValue(),checked);assert(await first.evaluate(el=>el.isConnected));assert(await page.evaluate(()=>originalGallery===document.querySelector('#gallery')));checks++;
  // Every preset displays a chosen image, even when custom styling is off.
  for(const style of schema.settings.find(s=>s.id==='style').options.map(s=>s.value)){
   await root.evaluate((el,style)=>{const po=el.matches('.po')?el:el.querySelector('.po');po.dataset.style=style;po.removeAttribute('data-custom-style');},style);
   assert(await image(1).isVisible(),style);assert((await image(1).boundingBox()).width>=20,style);checks++;
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log(checks+' saved tier image loading, in-place upload/replacement/removal, editor events, selection stability and preset checks passed');
}finally{await browser.close();}})().catch(err=>{console.error(err);process.exitCode=1});
