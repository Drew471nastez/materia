const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const button=attr=>`<button type="button" data-theme-button="primary" ${attr}><span data-label>Add chosen items</span></button>`;
const option=attr=>`<select ${attr}><option value="v" data-price="100" data-available="true">Small</option><option value="w" data-price="200" data-available="true">Large</option></select>`;
const offers={bundles:[{offerId:'b',title:'Together',fullCents:200,priceCents:200,items:[{id:'p',title:'One',priceCents:100,variants:[{id:'v',name:'Small',priceCents:100}]}]}],quantityBreaks:[{offerId:'q',title:'Choose quantity',tiers:[{quantity:2,freeQuantity:0}]}],checkoutOffers:[{offerId:'u',title:'Add one',offerPriceCents:100,product:{id:'p',title:'One',priceCents:100,variants:[{id:'v',name:'Small',priceCents:100}]}}]};
const fixtures={
 bundle:`<product-bundle data-storelib-sync="off"><div data-line><input type="checkbox" data-line-check checked>${option('data-line-variant')}</div>${button('data-offer-add').replace('data-label','class="po-button__text"')}<p data-message hidden></p></product-bundle>`,
 selected:`<upsell-pro data-added-text="Added" data-open-drawer="true"><div data-upsell-card><input type="checkbox" data-upsell-check checked>${option('data-upsell-variant')}</div>${button('data-upsell-add-selected')}<p data-message hidden></p></upsell-pro>`,
 individual:`<upsell-pro data-added-text="Added" data-open-drawer="true"><div data-upsell-card>${option('data-upsell-variant')}${button('data-upsell-add')}</div></upsell-pro>`,
 pair:`<pair-with data-button-text="Add chosen items" data-added-text="Added" data-open-drawer="true"><div class="pw-card">${option('data-variant-select')}${button('data-add-btn')}</div></pair-with>`,
 ...Object.fromEntries(['bundle','quantity_offer','upsell_pro'].map(kind=>['native-'+kind,`<storelib-product-offers data-kind="${kind}" data-product-id="p" data-selected="v"></storelib-product-offers>`]))
};
(async()=>{let checks=0;const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const [name,html]of Object.entries(fixtures))for(const width of [375,1280]){
  const p=await browser.newPage({viewport:{width,height:850}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.setContent('<style>:root{--color-text:#222;--color-heading:#111;--color-background:white;--color-border:#ccc}body{margin:16px}button{min-height:44px}</style><cart-notification><div id="minicart-form">Empty</div></cart-notification>'+html);
  await p.addStyleTag({content:read('shopify/assets/theme-button-contract.css')+read('shopify/assets/product-offers.css')});
  await p.evaluate(offers=>{
   window.posts=[];window.opens=0;window.Shopify={formatMoney:n=>'$'+(n/100).toFixed(2)};
   const cart=document.querySelector('cart-notification');cart.getSectionsToRender=()=>[{id:'minicart-form'}];cart.open=()=>{opens++;};
   document.querySelectorAll('storelib-product-offers').forEach(el=>{el.dataset.offers=JSON.stringify(offers);el.dataset.variants=JSON.stringify([{id:'v',price:100,available:true}]);el.dataset.options=JSON.stringify({add_mode:'selected',preselect:true,open_drawer_after_add:true,added_text:'Added'});});
   window.fetch=(url,config={})=>config.method==='POST'?new Promise(resolve=>{posts.push(JSON.parse(config.body));window.finishAdd=ok=>resolve({ok,status:ok?200:422,json:async()=>ok?{sections:{'minicart-form':'<div id="minicart-form">Confirmed items and totals</div>'}}:{message:'Out of stock'}});}):new Promise(()=>{});
  },offers);
  await p.addScriptTag({content:read('shopify/assets/product-offers.js')});
  const b=p.locator('button.offer-action').first();await b.waitFor();const box=await b.boundingBox();
  // A pre-existing cart snapshot must not undo a newly confirmed add while
  // the next count refresh is still pending.
  await p.evaluate(()=>document.dispatchEvent(new CustomEvent('cart:updated',{detail:{cart:{items:[]}}})));
  await b.click();assert.equal(await b.getAttribute('aria-busy'),'true');assert(await b.isDisabled());assert(await b.locator('.icon-load').isVisible());
  await b.evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));assert.equal(await p.evaluate(()=>posts.length),1,'one request '+name);
  await p.evaluate(()=>finishAdd(true));await p.waitForFunction(()=>opens===1);await p.waitForFunction(()=>!document.querySelector('button.offer-action').hasAttribute('aria-busy'));
  assert.equal(await p.locator('#minicart-form').textContent(),'Confirmed items and totals');
  assert.equal(await b.locator('[data-label], .po-button__text').textContent(),'Added',name+' confirmation');
  assert(!await b.locator('.icon-load').isVisible());assert(Math.abs((await b.boundingBox()).width-box.width)<1,name+' stable width');
  if(name==='bundle'||name==='selected'||name==='individual'){
   await p.locator('select').selectOption('w');assert.equal(await b.locator('[data-label], .po-button__text').textContent(),'Add chosen items');
   await b.click();await p.evaluate(()=>finishAdd(false));await p.waitForFunction(()=>!document.querySelector('button.offer-action').hasAttribute('aria-busy'));
   assert.equal(await p.evaluate(()=>opens),1,'failed add does not open drawer');assert.equal(await b.locator('[data-label], .po-button__text').textContent(),'Add chosen items');
   assert((await p.locator('body').textContent()).includes('Out of stock'));checks++;
  }
  if(name.startsWith('native-')){
   await p.evaluate(()=>document.dispatchEvent(new CustomEvent('cart:updated',{detail:{cart:{items:[]}}})));
   assert.equal(await b.getAttribute('data-added'),'false','confirmed removal clears Added');checks++;
   await b.click();await p.evaluate(()=>finishAdd(false));await p.waitForFunction(()=>!document.querySelector('button.offer-action').hasAttribute('aria-busy'));
   assert.equal(await b.getAttribute('data-added'),'false');assert((await p.locator('body').textContent()).includes('Out of stock'));assert.equal(await p.evaluate(()=>opens),1);checks++;
   await p.locator('storelib-product-offers').evaluate(el=>{el.variants.forEach(v=>v.available=false);el.querySelectorAll('option').forEach(o=>o.disabled=true);el.paintPrices();});
   assert(await b.isDisabled(),'unavailable native offer cannot add');checks++;
  }
  assert.deepEqual(errors,[]);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;await p.close();
 }
 console.log(checks+' delayed-cart, spinner, confirmation, duplicate-click, failure and responsive offer-action checks passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
