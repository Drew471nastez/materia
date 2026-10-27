// LIQUIDJS=<path> node tests/theme-quantity-offer-fallback.cjs
const fs=require('fs'),path=require('path'),Module=require('module'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const file=path.join(__dirname,'theme-empty-block-previews.cjs'),helper=new Module(file,module),src=read('tests/theme-empty-block-previews.cjs');helper.filename=file;helper.paths=module.paths;
helper._compile(src.slice(0,src.indexOf('(async()=>{'))+'\nmodule.exports={engine,clean,schema,defaults};',file);
const {engine,clean,schema,defaults}=helper.exports;
engine.registerFilter('money',n=>'$'+(Number(n)/100).toFixed(2));
const variants=[{id:'a',price:1000,available:true},{id:'b',price:1200,available:true}];
const product={id:'p',title:'Product',featured_image:'https://cdn.example/product.jpg',variants,selected_or_first_available_variant:variants[0],metafields:{storelib:{}}};
const render=(name,ctx)=>engine.parseAndRender(clean(read(name)),ctx,{globals:ctx});
const context=(settings,meta={},design=false)=>({product:{...product,metafields:{storelib:meta}},block:{id:'quantity',type:'quantity_offer',settings},section:{id:'main'},kind:'quantity_offer',product_form_id:'product-form-main',shop:{currency:'USD',money_format:'${{amount}}'},request:{design_mode:design}});
(async()=>{let checks=0;
 for(const section of ['sections/main-product.storelib','sections/featured-product.storelib'])for(const design of [false,true]){
  const block=schema(section).shopify.blocks.find(b=>b.type==='quantity_offer'),settings=Object.fromEntries(block.settings.filter(s=>s.id&&'default'in s).map(s=>[s.id,s.default]));
  for(const meta of [{},{offers:{}},{offers:{value:{quantityBreaks:[]}}},{offers:{value:{checkoutOffers:[{offerId:'other'}]}}}]){
   const html=await render('snippets/product-offers.storelib',context(settings,meta,design));assert(html.includes('<quantity-offer'),'configured tiers must render without backend tiers');assert.equal((html.match(/class="po-tier__radio"/g)||[]).length,3);checks++;
  }
 }
 const sparse=await render('blocks/quantity_offer.storelib',context({}));assert.equal((sparse.match(/class="po-tier__radio"/g)||[]).length,3);assert(sparse.includes('data-paid="2"')&&sparse.includes('data-paid="3"'));checks++;
 const off=await render('snippets/product-offers.storelib',context({...defaults('quantity_offer'),tier_1_enable:false,tier_2_enable:false,tier_3_enable:false,tier_4_enable:false}));assert(!off.includes('class="po-tier__radio"'),'explicitly disabled tiers remain disabled');checks++;
 const native={offers:{value:{quantityBreaks:[{offerId:'active',tiers:[{quantity:1,freeQuantity:2,label:'Buy 1 get 2 free'}]}]}}};
 const nativeHtml=await render('blocks/quantity_offer.storelib',context(defaults('quantity_offer'),native));assert(nativeHtml.includes('<storelib-product-offers')&&nativeHtml.includes('Buy 1 get 2 free'));checks++;
 const pictured={...defaults('quantity_offer'),style:'cards',tier_1_image:'https://cdn.example/tier-1.jpg',tier_1_caption:'Single',tier_2_image:{src:'https://cdn.example/tier-2.jpg',alt:'Pair'},custom_style:true,custom_bg:'#112233',accent_color:'#445566',tier_2_badge:'Popular'};
 const picturedHtml=await render('blocks/quantity_offer.storelib',context(pictured));
 assert(picturedHtml.includes('src="https://cdn.example/tier-1.jpg"')&&picturedHtml.includes('Single')&&picturedHtml.includes('src="https://cdn.example/tier-2.jpg"')&&picturedHtml.includes('alt="Pair"')&&picturedHtml.includes('--po-c-bg: #112233')&&picturedHtml.includes('--po-accent: #445566')&&picturedHtml.includes('Popular'),'uploaded tier images, captions, badges and colours render');checks++;
 const linked=await render('blocks/quantity_offer.storelib',context({...defaults('quantity_offer'),tier_3_image:{url:'https://cdn.example/tier-3.jpg',alt:'Three'}}));
 assert(linked.includes('src="https://cdn.example/tier-3.jpg"')&&linked.includes('alt="Three"'),'an image address under the picker is used as it is');checks++;
 const tiles={...defaults('quantity_offer'),style:'image_tiles'};
 const tilesHtml=await render('blocks/quantity_offer.storelib',context(tiles));
 assert(tilesHtml.includes('class="po-tier__image"'),'image tiles use the product image when a tier image is empty');checks++;
 const settings={...defaults('quantity_offer'),tier_1_free:2,tier_1_discount:20};
 const unpriced=await render('blocks/quantity_offer.storelib',context(settings));assert(unpriced.includes('data-tier-total>$30.00'),'SSR must not invent free-item savings');assert(unpriced.includes('data-tier-percent hidden'));checks++;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
  for(const failure of [false,true])for(const action of ['own','main']){
   const p=await browser.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
   const html=await render('blocks/quantity_offer.storelib',context({...defaults('quantity_offer'),purchase_action:action}));
   await p.setContent('<form id="product-form-main"><input name="id" value="a"><input name="quantity" value="1"><button type="submit"><span data-btn-label>Add to cart</span></button></form><cart-notification></cart-notification>'+html);
   await p.addStyleTag({content:read('shopify/assets/product-offers.css')});
   await p.evaluate(failure=>{window.sent=[];window.opens=0;window.Shopify={formatMoney:n=>'$'+(Number(n)/100).toFixed(2)};const cart=document.querySelector('cart-notification');cart.getSectionsToRender=()=>[];cart.open=()=>opens++;window.fetch=async(url,opts={})=>{if(String(url).includes('/api/offers'))return {ok:!failure,json:async()=>({quantityBreaks:[]})};if(opts.method==='POST'){sent.push(JSON.parse(opts.body));return {ok:true,json:async()=>({items:sent.at(-1).items})};}return {ok:true,json:async()=>({items:[],item_count:0})};};},failure);
   await p.addScriptTag({content:read('shopify/assets/product-offers.js')});
   assert(await p.locator('quantity-offer .po-tier').first().isVisible());assert.equal(await p.locator('quantity-offer .po-tier').count(),3);checks++;
   await p.locator('.po-tier__radio').nth(1).check();assert.equal(await p.locator('form [name=quantity]').inputValue(),'2');
   await p.locator('form [name=id]').evaluate(el=>{el.value='b';el.dispatchEvent(new Event('change',{bubbles:true}));});assert.equal(await p.locator('[data-tier-total]').nth(1).textContent(),'$24.00');checks++;
   await p.locator(action==='main'?'form button':'[data-offer-add]').click();await p.waitForFunction(()=>sent.length===1&&opens===1);assert.deepEqual(await p.evaluate(()=>sent[0].items.map(i=>[i.id,i.quantity])),[['b',2]]);assert.deepEqual(errors,[]);checks++;
   await p.close();
  }
  const p=await browser.newPage();await p.setContent('<form id="product-form-main"><input name="id" value="a"><input name="quantity" value="1"></form><cart-notification></cart-notification>'+unpriced);
  await p.evaluate(()=>{
   window.sent=[];window.Shopify={formatMoney:n=>'$'+(Number(n)/100).toFixed(2)};const cart=document.querySelector('cart-notification');cart.getSectionsToRender=()=>[];cart.open=()=>{};
   window.fetch=async(url,opts={})=>{if(String(url).includes('/api/offers'))return {ok:true,json:async()=>({quantityBreaks:[{offerId:'active',tiers:[{quantity:1,freeQuantity:2,discountType:'free'}]}]})};if(opts.method==='POST'){sent.push(JSON.parse(opts.body));return {ok:true,json:async()=>({items:sent.at(-1).items})};}return {ok:true,json:async()=>({items:[]})};};
  });await p.addScriptTag({content:read('shopify/assets/product-offers.js')});await p.waitForFunction(()=>document.querySelector('.po-tier__radio').dataset.offerId==='active');
  assert.equal(await p.locator('[data-tier-total]').first().textContent(),'$10.00','a matched backend offer authorizes the free units');checks++;
  await p.locator('[data-offer-add]').click();await p.waitForFunction(()=>sent.length===1);const lines=await p.evaluate(()=>sent[0].items);  assert.equal(lines[0].quantity,3);assert.equal(lines[0].properties._sl_offer_id,'active');assert.equal(lines[0].properties._sl_free_qty,'2');checks++;await p.close();
  const nativeSettings={...defaults('quantity_offer'),style:'image_tiles',tier_1_free:2,tier_1_image:'https://cdn.example/native-1.jpg',tier_1_caption:'First look',tier_1_badge:'Best',custom_style:true,custom_heading:'#123456',checkout_note:'Taken off at checkout.',save_label:'Save',you_save_label:'You save',per_item_label:'each'};
  const nativeView=await render('blocks/quantity_offer.storelib',context(nativeSettings,native));
  const nativePage=await browser.newPage();
  await nativePage.setContent('<form id="product-form-main"><input name="id" value="a"></form>'+nativeView);
  await nativePage.addStyleTag({content:read('shopify/assets/product-offers.css')});
  await nativePage.evaluate(()=>{window.Shopify={formatMoney:n=>'$'+(Number(n)/100).toFixed(2)};});
  await nativePage.addScriptTag({content:read('shopify/assets/product-offers.js')});
  await nativePage.waitForSelector('storelib-product-offers .po-tier__image');
  assert.equal(await nativePage.locator('.po-tier__image').getAttribute('src'),'https://cdn.example/native-1.jpg');
  assert.equal(await nativePage.locator('.po-tier__caption').textContent(),'First look');
  assert.equal(await nativePage.locator('.po-tier__badge').textContent(),'Best');
  assert.equal(await nativePage.locator('[data-offer-note]').textContent(),'Taken off at checkout.');
  assert.equal(await nativePage.locator('.po-qty').getAttribute('data-style'),'image_tiles');
  assert.equal(await nativePage.locator('.po-tier__total').textContent(),'$10.00');
  assert.equal(await nativePage.locator('.po-qty').evaluate(el=>el.style.getPropertyValue('--po-c-heading')),'#123456');checks++;
  await nativePage.close();
 }finally{await browser.close();}
 console.log(checks+' quantity-offer empty-backend, new-block defaults, native preservation, visible tiers and own/main cart checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
