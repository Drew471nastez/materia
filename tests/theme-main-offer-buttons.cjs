const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const control=(id,attr)=>`<input type="hidden" ${attr} value="${id}" data-price="100" data-available="true">`;
const form=id=>`<form id="${id}"><input name="id" value="m"><input name="quantity" type="number" min="1" value="2"><input required name="properties[Name]" value="Alex"><button type="submit" name="add" data-theme-button="primary"><span data-btn-label>Add to cart</span><svg class="icon-load"></svg></button><button type="submit" name="checkout" data-storelib-buy-now data-theme-button="secondary"><svg class="btn-icon"></svg><span data-btn-label>Buy now</span></button></form>`;
const bundle=(id,mode='main')=>`<product-bundle data-form-id="${id}" data-product-id="p" data-storelib-sync="off" data-purchase-action="${mode}"><div data-line data-main-line><input type="checkbox" data-line-check checked>${control('m','data-line-variant')}</div><div data-line><input type="checkbox" data-line-check checked>${control('a','data-line-variant')}</div><button type="button" data-offer-add><span class="po-button__text">Buy together</span></button><p data-message hidden></p></product-bundle>`;
const upsells=id=>`<upsell-pro data-form-id="${id}" data-purchase-action="main" data-mode="selected">${['a','z'].map(v=>`<div data-upsell-card><input type="checkbox" data-upsell-check checked>${control(v,'data-upsell-variant')}</div>`).join('')}<button data-upsell-add-selected type="button"><span data-label>Add chosen</span></button></upsell-pro>`;
const pair=id=>`<pair-with data-form-id="${id}" data-purchase-action="main"><div class="pw-card"><input type="checkbox" data-pw-picked checked>${control('q','data-variant-select')}<button type="button" data-add-btn>Add</button></div></pair-with>`;
const nativeData={quantityBreaks:[{offerId:'tier',tiers:[{quantity:2,freeQuantity:1}]}],bundles:[{offerId:'b1',title:'First',items:[{id:'p',title:'Main',variants:[{id:'m',priceCents:100}]},{id:'a',title:'A',variants:[{id:'a',priceCents:100}]}]},{offerId:'b2',title:'Second',items:[{id:'p',title:'Main',variants:[{id:'m',priceCents:100}]},{id:'b',title:'B',variants:[{id:'b',priceCents:100}]}]}],checkoutOffers:[{offerId:'up',product:{id:'q',title:'Extra',variants:[{id:'q',priceCents:100}]}}]};
(async()=>{let checks=0;
 for(const file of ['sections/main-product.storelib','sections/featured-product.storelib','blocks/bundle.storelib','blocks/quantity_offer.storelib','blocks/upsell_pro.storelib']){
  const schema=JSON.parse(read(file).match(/<schema>([\s\S]*?)<\/schema>/)[1]).shopify;
  for(const block of schema.blocks||[schema]){
   if(!['bundle','quantity_offer','upsell_pro','pair_with_upsell'].includes(block.type||file.split('/').at(-1).replace('.storelib','')))continue;
   const action=block.settings.find(s=>s.id==='purchase_action');assert.equal(action.default,'own');assert.deepEqual(action.options.map(o=>o.value),['own','main','both']);assert.equal(block.settings.find(s=>s.id==='show_button').default,true);
   const ids=block.settings.filter(s=>s.id).map(s=>s.id);assert.equal(ids.length,new Set(ids).size);
  }checks++;
 }
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 async function setup(html,{fail=false,terms=false,pending=false}={}){
  const p=await browser.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.setContent(`<style>:root{--color-heading:#111;--color-text:#222;--color-background:white;--color-border:#ccc}button{min-height:44px}body{margin:16px}</style><cart-notification><div id="minicart-form"></div><input type="checkbox" name="agree"><button name="checkout" class="btn-checkout" type="button" ${terms?'disabled':''}>Checkout</button></cart-notification>`+html);
  await p.addStyleTag({content:read('shopify/assets/theme-button-contract.css')+read('shopify/assets/product-offers.css')});
  await p.evaluate(({fail,pending,data})=>{
   window.posts=[];window.opens=0;window.checkouts=0;window.normalSubmits=0;window.singleBuys=0;
   window.Shopify={formatMoney:v=>'$'+(v/100).toFixed(2)};
   const cart=document.querySelector('cart-notification');cart.getSectionsToRender=()=>[{id:'minicart-form'}];cart.open=()=>{opens++;};cart.querySelector('.btn-checkout').addEventListener('click',()=>checkouts++);
   document.querySelectorAll('form').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();normalSubmits++;}));
   document.addEventListener('click',e=>{if(e.target.closest('[data-storelib-buy-now]'))singleBuys++;});
   document.querySelectorAll('storelib-product-offers').forEach(el=>{el.dataset.options=JSON.stringify({purchase_action:'main',show_button:true,add_mode:'selected',preselect:true});el.dataset.variants=JSON.stringify([{id:'m',price:100,available:true}]);if(!pending)el.dataset.offers=JSON.stringify(data);});
   window.fetch=async(url,config={})=>{
    if(String(url).includes('/api/offers'))return pending?new Promise(resolve=>window.resolveOffers=()=>resolve({ok:true,json:async()=>data})):{ok:true,json:async()=>data};
    if(config.method==='POST'){const body=JSON.parse(config.body);posts.push(body);return {ok:!fail,status:fail?422:200,json:async()=>fail?{message:'Stock changed'}:{items:body.items,sections:{'minicart-form':'<div id="minicart-form">Confirmed</div>'}}};}
    return {ok:true,json:async()=>({items:posts.at(-1)?.items||[],item_count:1})};
   };
  },{fail,pending,data:nativeData});
  await p.addScriptTag({content:read('shopify/assets/product-offers.js')});await p.waitForTimeout(40);return {p,errors};
 }
 {
  const {p,errors}=await setup(form('main')+bundle('main')+upsells('main')+pair('main')+form('featured')+bundle('featured'));
  assert(!await p.locator('product-bundle').first().locator('[data-offer-add]').isVisible());assert(!await p.locator('upsell-pro [data-upsell-add-selected]').isVisible());checks++;
  await p.locator('#main button[name=add]').click();await p.waitForFunction(()=>posts.length===1&&!document.querySelector('#main button[name=add]').hasAttribute('aria-busy'));
  const lines=await p.evaluate(()=>posts[0].items);assert.deepEqual(Object.fromEntries(lines.map(i=>[i.id,i.quantity])),{m:2,a:2,z:1,q:1});assert.equal(lines.find(i=>i.id==='m').properties.Name,'Alex');assert.equal(await p.evaluate(()=>normalSubmits),0);checks++;
  assert.equal(await p.evaluate(()=>opens),1);assert.equal(await p.locator('#main button[name=add] > .icon-load').count(),1,'reuse existing spinner');checks++;
  await p.locator('#featured button[name=add]').click();await p.waitForFunction(()=>posts.length===2);assert.deepEqual(await p.evaluate(()=>Object.fromEntries(posts[1].items.map(i=>[i.id,i.quantity]))),{m:2,a:2});checks++;
  await p.locator('#main button[name=checkout]').click();await p.waitForFunction(()=>checkouts===1);assert.equal(await p.evaluate(()=>singleBuys),0);assert.equal(await p.evaluate(()=>posts.length),3);checks++;
  await p.locator('product-bundle[data-form-id=main],upsell-pro,pair-with').evaluateAll(els=>els.forEach(el=>el.remove()));await p.waitForTimeout(40);
  assert(await p.locator('#main button[name=checkout]').evaluate(el=>el.hasAttribute('data-storelib-buy-now')),'restore native hook after linked blocks removed');checks++;
  assert.deepEqual(errors,[]);await p.close();
 }
 for(const kind of ['bundle','quantity_offer','upsell_pro']){
  const {p,errors}=await setup(form('main')+`<storelib-product-offers data-kind="${kind}" data-form-id="main" data-product-id="p" data-selected="m"></storelib-product-offers>`);
  if(kind==='bundle')await p.locator('input[name^=linked-bundle-]').nth(1).check();
  await p.locator('#main button[name=add]').click();await p.waitForFunction(()=>posts.length===1&&!document.querySelector('#main button[name=add]').hasAttribute('aria-busy'));
  const expected=kind==='bundle'?{m:2,b:2}:kind==='quantity_offer'?{m:3}:{m:2,q:1};assert.deepEqual(await p.evaluate(()=>Object.fromEntries(posts[0].items.map(i=>[i.id,i.quantity]))),expected);checks++;
  assert.deepEqual(errors,[]);await p.close();
 }
 {
  const html=['quantity_offer','bundle','upsell_pro'].map(kind=>`<storelib-product-offers data-kind="${kind}" data-form-id="main" data-product-id="p" data-selected="m"></storelib-product-offers>`).join('');
  const {p}=await setup(form('main')+html);await p.locator('input[name^=linked-bundle-]').nth(1).check();
  await p.evaluate(()=>document.querySelector('#main').requestSubmit(document.querySelector('#main button[name=add]')));
  await p.waitForFunction(()=>posts.length===1);
  assert.deepEqual(await p.evaluate(()=>Object.fromEntries(posts[0].items.map(i=>[i.id,i.quantity]))),{m:3,b:3,q:1},'tier, selected bundle and upsell combine without doubling the main variant');assert.equal(await p.evaluate(()=>normalSubmits),0);checks++;await p.close();
 }
 {
  const {p}=await setup(form('main')+bundle('main','both'));assert(await p.locator('[data-offer-add]').isVisible());
  await p.locator('[data-offer-add]').click();await p.waitForFunction(()=>posts.length===1);assert.deepEqual(await p.evaluate(()=>Object.fromEntries(posts[0].items.map(i=>[i.id,i.quantity]))),{m:1,a:1});
  await p.locator('#main button[name=add]').click();await p.waitForFunction(()=>posts.length===2);assert.deepEqual(await p.evaluate(()=>Object.fromEntries(posts[1].items.map(i=>[i.id,i.quantity]))),{m:2,a:2});checks++;await p.close();
 }
 {
  const {p}=await setup(form('main')+bundle('main'),{terms:true});await p.locator('#main button[name=checkout]').click();await p.waitForFunction(()=>opens===1);assert.equal(await p.evaluate(()=>checkouts),0);assert(!await p.locator('input[name=agree]').isChecked());assert((await p.locator('[data-main-offer-status]').textContent()).includes('required terms'));checks++;await p.close();
 }
 {
  const {p}=await setup(form('main')+bundle('main'),{fail:true});await p.locator('#main button[name=checkout]').click();await p.waitForFunction(()=>document.querySelector('[data-main-offer-status]').textContent==='Stock changed');assert.equal(await p.evaluate(()=>checkouts+opens),0);assert(!await p.locator('#main button[name=checkout]').isDisabled());checks++;await p.close();
 }
 {
  const {p}=await setup(form('main')+bundle('main'));await p.locator('#main input[required]').fill('');await p.locator('#main button[name=add]').click();await p.waitForTimeout(50);assert.equal(await p.evaluate(()=>posts.length),0);checks++;await p.close();
 }
 {
  const {p}=await setup(form('main')+bundle('main','own'));await p.locator('#main button[name=add]').click();assert.equal(await p.evaluate(()=>normalSubmits),1);assert.equal(await p.evaluate(()=>posts.length),0);checks++;await p.close();
 }
 {
  const {p}=await setup(form('main')+'<storelib-product-offers data-kind="bundle" data-form-id="main" data-product-id="p"></storelib-product-offers>',{pending:true});await p.locator('#main button[name=add]').click();assert.equal(await p.evaluate(()=>posts.length),0);assert(await p.locator('#main button[name=add]').isDisabled());await p.evaluate(()=>resolveOffers());await p.waitForFunction(()=>posts.length===1);checks++;await p.close();
 }
 console.log(checks+' shared purchase-button, native/manual selection, checkout-terms, required-field, isolation and error checks passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
