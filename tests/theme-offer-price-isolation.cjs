// Selection/price ownership regressions. Cart/API responses are fixtures.
const fs=require('fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {engine,PANTS}=require('./theme-featured-product-round5.cjs');
const read=f=>fs.readFileSync(f,'utf8');
const clean=s=>s.split('<schema>')[0].replace(/^<template compat="shopify">/,'').replace(/<\/template>\s*$/,'');
const defs=f=>Object.fromEntries(JSON.parse(read(f).split('<schema>')[1].split('</schema>')[0]).shopify.settings.filter(s=>s.id&&'default'in s).map(s=>[s.id,s.default]));
const control=attr=>`<select ${attr}><option value="extra" data-price="500" data-available="true">Extra</option><option value="other" data-price="700" data-available="true">Other</option></select>`;
const bundle=id=>`<product-bundle data-form-id="${id}" data-storelib-sync="off"><div data-line><input type="checkbox" data-line-check checked>${control('data-line-variant')}<span data-line-price></span></div><span data-total></span></product-bundle>`;
const upsell=id=>`<upsell-pro data-form-id="${id}" data-mode="selected"><div data-upsell-card><input type="checkbox" data-upsell-check checked>${control('data-upsell-variant')}<span data-upsell-price></span></div><span data-upsell-total></span></upsell-pro>`;
(async()=>{let checks=0;
 assert(!read('snippets/product-info-blocks.storelib').includes('data-offer-price'));assert(!read('shopify/assets/main-product.js').includes('data-selected-purchase-price'));checks++;
 for(const file of ['sections/main-product.storelib','sections/featured-product.storelib','sections/featured-product2.storelib']){
   const schema=JSON.parse(read(file).split('<schema>')[1].split('</schema>')[0]).shopify;
   const fields=schema.blocks.find(b=>b.type==='price').settings;
   for(const id of ['offer_unit_price_label','selected_offer_total_label'])assert.equal(fields.find(s=>s.id===id).visible_if,'{{ false }}');checks++;
 }
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{for(const width of [390,1366])for(const design of [false,true])for(const native of [false,true]){
 const p=await browser.newPage({viewport:{width,height:900}}),e=engine(),errors=[];p.on('pageerror',err=>errors.push(err.message));
 const variants=[{id:'a',title:'Small',price:1000,available:true},{id:'b',title:'Large',price:1500,available:true}];
 const data={quantityBreaks:[{offerId:'real',tiers:[{quantity:1},{quantity:2,freeQuantity:1,discountType:'percent',discountValue:10}]}]};
 const section=async id=>{const ctx={settings:{},request:{design_mode:design},section:{id},product_form_id:'form-'+id,kind:'quantity_offer',shop:{currency:'USD',money_format:'${{amount}}'},block:{id:'offer-'+id,type:'quantity_offer',settings:{...defs('blocks/quantity_offer.storelib'),purchase_action:'both',sync_form_quantity:true}},product:{...PANTS,id:'p',variants,selected_or_first_available_variant:variants[0],metafields:{storelib:native?{offers:{value:data}}:{}}}};return '<section class="shopify-section" id="'+id+'"><div id="price-'+id+'">$10.00</div><div class="product-detail__buy-buttons"><form id="form-'+id+'"><input name="id" value="a"><input class="quantity-input" name="quantity" value="1"><button type="submit" name="add">Add to cart</button></form></div>'+await e.parseAndRender(clean(read('snippets/product-offers.storelib')),ctx,{globals:ctx})+bundle('form-'+id)+upsell('form-'+id)+'</section>';};
 await p.setContent(await section('main')+await section('featured')+'<cart-notification></cart-notification>');await p.addStyleTag({content:read('shopify/assets/product-offers.css')});
 await p.evaluate(design=>{window.Shopify={designMode:design,formatMoney:n=>'$'+(Number(n)/100).toFixed(2)};const cart=document.querySelector('cart-notification');cart.getSectionsToRender=()=>[];cart.open=()=>{};window.sent=[];window.offersChanged=0;window.fetch=async(url,opts={})=>{if(opts.method==='POST'){sent.push(JSON.parse(opts.body));return {ok:true,json:async()=>({items:sent.at(-1).items})};}return {ok:true,json:async()=>({items:[]})};};
 // A broad external pricing handler must not receive offer option/quantity
 // events. Genuine product variant changes remain public and update normally.
 document.addEventListener('change',event=>{const section=event.target.closest('section');if(section)section.querySelector('[id^=price-]').textContent=event.target.name==='id'?(event.target.value==='b'?'$15.00':'$10.00'):'WRONG OFFER PRICE';});
 document.addEventListener('materia:offer-selection-change',()=>offersChanged++);
 document.querySelectorAll('form').forEach(form=>form.addEventListener('submit',event=>event.preventDefault()));
 },design);
 const main=read('shopify/assets/main-product.js'),sync=main.slice(main.indexOf('var SyncQuantityInput ='),main.indexOf('class SlideSectionProductSet'));
 await p.addScriptTag({content:sync});await p.addScriptTag({content:read('shopify/assets/product-offers.js')});
 const root=p.locator('#main '+(native?'storelib-product-offers':'quantity-offer'));
 await root.locator('.po-tier__radio').nth(1).check();
 assert.equal(await p.locator('#price-main').textContent(),'$10.00');assert.equal(await p.locator('#price-featured').textContent(),'$10.00');assert.equal(await p.locator('#form-main [name=quantity]').inputValue(),native?'3':'2');assert.equal(await p.locator('#form-featured [name=quantity]').inputValue(),'1');checks++;
 await p.locator('#main [data-line-variant]').selectOption('other');assert.equal(await p.locator('#main [data-line-price]').textContent(),'$7.00');assert.equal(await p.locator('#price-main').textContent(),'$10.00');checks++;
 await p.locator('#main [data-line-check]').uncheck();await p.locator('#main [data-upsell-variant]').selectOption('other');assert.equal(await p.locator('#main [data-upsell-price]').textContent(),'$7.00');assert.equal(await p.locator('#price-main').textContent(),'$10.00');checks++;
 await p.locator('#main [data-upsell-check]').uncheck();assert.equal(await p.locator('#price-main').textContent(),'$10.00');assert(await p.evaluate(()=>offersChanged>=4));checks++;
 await p.locator('#form-main [name=id]').evaluate(input=>{input.value='b';input.dispatchEvent(new Event('change',{bubbles:true}));});assert.equal(await p.locator('#price-main').textContent(),'$15.00');assert.equal(await p.locator('#price-featured').textContent(),'$10.00');assert.equal(await root.locator(native?'.po-tier__total':'[data-tier-total]').nth(1).textContent(),native?'$27.00':'$30.00');checks++;
 await p.locator('#form-main button').click();await p.waitForFunction(()=>sent.length===1);assert.deepEqual(await p.evaluate(()=>sent[0].items.map(line=>[line.id,line.quantity])),[['b',native?3:2]]);await p.waitForFunction(()=>!document.querySelector('#form-main button').hasAttribute('aria-busy'));assert.equal(await p.locator('[data-main-offer-status]').textContent(),await root.evaluate(el=>el.addedText));assert.deepEqual(errors,[]);assert.equal(await p.locator('[data-selected-purchase-price], [data-offer-unit-price-label]').count(),0);checks++;
 // The isolation is reinstalled once, not multiplied, after a builder redraw.
 await p.locator('#main').evaluate(section=>{section.innerHTML=section.innerHTML;});await p.locator('#main '+(native?'storelib-product-offers':'quantity-offer')+' .po-tier__radio').first().check();assert.equal(await p.locator('#price-main').textContent(),'$15.00');checks++;

 // An open editor may still contain the previous version's price summary.
 await p.locator('#price-main').evaluate(el=>{el.dataset.offerPriceActive='';el.insertAdjacentHTML('beforeend','<small data-offer-unit-price-label>Product price (per item)</small><div data-selected-purchase-price>Selected total $999</div>');});
 await p.locator('#main').evaluate(section=>section.dispatchEvent(new CustomEvent('storelib:section-load',{bubbles:true})));
 await p.waitForFunction(()=>!document.querySelector('[data-selected-purchase-price], [data-offer-unit-price-label]'));assert.equal(await p.locator('#price-main').textContent(),'$15.00');assert(!(await p.locator('#price-main').getAttribute('data-offer-price-active')));checks++;
 await p.close();
 }console.log(checks+' offer/product price ownership, scoped quantities, genuine variant, cart payload and redraw checks passed');}finally{await browser.close();}})().catch(err=>{console.error(err);process.exitCode=1});
