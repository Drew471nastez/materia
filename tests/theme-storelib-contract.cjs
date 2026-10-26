// LIQUIDJS=<installed liquidjs path> node tests/theme-storelib-contract.cjs
const fs=require('node:fs'),path=require('node:path'),Module=require('module'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const source=read('tests/theme-empty-block-previews.cjs'),filename=path.join(__dirname,'theme-empty-block-previews.cjs');
const helper=new Module(filename,module);helper.filename=filename;helper.paths=module.paths;
helper._compile(source.slice(0,source.indexOf('(async()=>{'))+'\nmodule.exports={engine,clean,schema,defaults};',filename);
const {engine,clean,schema,defaults}=helper.exports;
engine.registerFilter('money',v=>'$'+(Number(v)/100).toFixed(2));engine.registerFilter('money_with_currency',v=>'$'+(Number(v)/100).toFixed(2)+' USD');
const offers={bundles:[{offerId:'bundle',title:'Buy together',label:'Bundle',fullCents:4600,priceCents:4000,items:[{id:'p',title:'Tee',priceCents:3600,variants:[{id:'v',name:'Small',priceCents:3600}]},{id:'q',title:'Cap',priceCents:1000,variants:[{id:'cap',name:'Default',priceCents:1000}]}]}],quantityBreaks:[{offerId:'quantity',productId:'p',title:'Choose quantity',tiers:[{quantity:2,freeQuantity:1,discountType:'free',label:'Buy 2 get 1 free'},{quantity:3,freeQuantity:2,discountType:'free',label:'Buy 3 get 2 free'},{quantity:2,freeQuantity:0,discountType:'amount',discountValue:900,label:'Save $9'},{quantity:2,freeQuantity:0,discountType:'percent',discountValue:15,label:'Save 15%'}]}],checkoutOffers:[{offerId:'upsell',title:'Add a cap',label:'Special offer',offerPriceCents:800,product:{id:'q',title:'Cap',priceCents:1000,variants:[{id:'cap',name:'Default',priceCents:1000}]}}]};
const product={id:'p',title:'Tee',variants:[{id:'v',title:'Small',price:3600,available:true},{id:'large',title:'Large',price:4200,available:true}],selected_or_first_available_variant:{id:'v',price:3600,available:true},metafields:{storelib:{offers:{value:offers}}}};
const context=(type,extra={})=>({product,page:{product},section:{id:'main'},block:{id:type,type,settings:{...defaults(type),button_label:'Add to cart'}},shop:{currency:'USD',money_format:'${{amount}}'},cart:{currency:'USD'},request:{design_mode:true},...extra});
const render=(name,ctx)=>engine.parseAndRender(clean(read(name)),ctx,{globals:ctx});
(async()=>{
 let checks=0;
 const html={};for(const type of ['bundle','quantity_offer','upsell_pro','sold_counter','product_custom_field']){
  assert(schema('blocks/'+type+'.storelib').shopify.settings.length);
  html[type]=await render('blocks/'+type+'.storelib',context(type));
  assert(html[type].trim().length>0);checks++;
 }
 assert(html.quantity_offer.includes('data-offers=')&&html.quantity_offer.includes('Buy 2 get 1 free'));checks++;
 const cartItem={key:'v:personal',id:'v',variant_id:'v',quantity:5,product:{...product,has_only_default_variant:true},variant:{available:true},properties:{Name:'Alex',Photo:'/api/cart/uploads/private.sig/photo.png',_sl_discount:'percent:90'},original_price:3600,final_price:2160,original_line_price:18000,final_line_price:10800,line_level_discount_allocations:[{amount:7200,discount_application:{title:'Buy 3 get 2 free'}}]};
 const line=await render('snippets/cart-item.storelib',{...context('bundle'),item:cartItem,settings:{hidden_price:false}});
 assert(line.includes('$108.00')&&line.includes('$180.00')&&line.includes('$72.00'));assert(!line.includes('percent:90'));assert(line.includes('<img src="/api/cart/uploads/private.sig/photo.png"'));checks++;
 const stars=await render('snippets/review.storelib',{product:{metafields:{storelib:{reviews:{value:{average:4.8,count:12}}}}}});assert(stars.includes('4.8 / 5')&&stars.includes('12'));checks++;
 const code=await render('snippets/cart-code-status.storelib',{cart:{discount_codes:[{code:'UNKNOWN',applicable:false}]},discount_code:'UNKNOWN'});assert(code.includes('data-applicable="false"'));checks++;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const width of [390,1366]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:''}));await page.goto('http://preview.test/');
   await page.setContent('<cart-notification></cart-notification><form id="product-form-main"><input name="id" value="v"><input name="quantity" value="1"><input name="properties[Name]" value="Alex" required><input type="file" name="properties[Photo]"></form>'+html.quantity_offer+html.bundle+html.upsell_pro);
   await page.addStyleTag({content:read('shopify/assets/product-offers.css')});
   await page.evaluate(()=>{
    window.Shopify={formatMoney:n=>'$'+(Number(n)/100).toFixed(2)};
    const cart=document.querySelector('cart-notification');cart.getSectionsToRender=()=>[];cart.open=()=>{};cart.applyCartState=state=>{window.confirmed=state;};
    window.sent=[];window.fetch=async(url,config={})=>{
     window.sent.push({url,body:config.body instanceof FormData?'multipart':config.body});
     if(url==='/cart/upload')return {ok:true,json:async()=>({upload:{value:'/api/cart/uploads/private.sig/photo.png'}})};
     if(url==='/cart.js')return {ok:true,json:async()=>({items:[{product_id:'p',variant_id:'v',quantity:5}],item_count:5,items_subtotal_price:10800,total_price:9720,total_discount:8280})};
     return {ok:true,json:async()=>({items:[{id:'v'}]})};
    };
   });
   const utils=read('shopify/assets/utils.js');await page.addScriptTag({content:utils.slice(utils.indexOf('Shopify.formatMoney ='),utils.indexOf('var getScrollBarWidth'))});
   await page.addScriptTag({content:read('shopify/assets/product-offers.js')});
   const root=page.locator('storelib-product-offers[data-kind="quantity_offer"]');
   assert.equal(await root.locator('.po-tier__total').nth(0).textContent(),'$72.00');
   assert.equal(await root.locator('.po-tier__total').nth(1).textContent(),'$108.00');
   assert.equal(await root.locator('.po-tier__total').nth(2).textContent(),'$63.00');checks++;
   await root.locator('.po-tier').nth(1).click();assert.equal(await page.locator('[name="quantity"]').inputValue(),'5');
   assert.equal(await page.locator('[data-native-offer-id]').inputValue(),'quantity');checks++;
   await page.locator('form input[type=file]').evaluate(el=>{el.required=true;});
   await root.locator('button').click();assert.equal(await page.evaluate(()=>sent.filter(r=>r.url==='/cart/add.js').length),0);checks++;
   await page.locator('form input[type=file]').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:Buffer.from('test')});
   await root.locator('button').click();await page.waitForFunction(()=>window.confirmed?.total_price===9720);
   const sent=await page.evaluate(()=>sent);const add=JSON.parse(sent.find(r=>r.url==='/cart/add.js').body);
   assert.equal(add.items.length,1);assert.equal(add.items[0].quantity,5);assert.equal(add.items[0].properties._sl_offer_id,'quantity');assert.equal(add.items[0].properties.Name,'Alex');assert.equal(add.items[0].properties.Photo,'/api/cart/uploads/private.sig/photo.png');checks++;
   const changed=await page.evaluate(()=>{const api=window.MateriaProductOffers;return [api.tierPrice({quantity:2,freeQuantity:1},{price:3600}).total,api.tierPrice({quantity:3,freeQuantity:2},{price:3600}).total,api.tierPrice({quantity:2,discountType:'percent',discountValue:50},{price:101}).total];});
   assert.deepEqual(changed,[7200,10800,102]);checks++;
   const bundle=page.locator('storelib-product-offers[data-kind="bundle"]');assert.equal(await bundle.locator('.po-summary__amount').textContent(),'$40.00');
   await bundle.locator('input[type=checkbox]').first().uncheck();assert.equal(await bundle.locator('.po-summary__amount').textContent(),'');checks++;
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);checks++;
   // Same actual variant prices, but a market currency: free units remain exact;
   // amount/percent totals must not be computed from store-currency offers.
   await root.evaluate(el=>{el.dataset.currency='EUR';el.dataset.moneyFormat='€{{amount}}';el.dataset.variants=JSON.stringify([{id:'v',price:3299,available:true}]);el.disconnectedCallback();el.connectedCallback();});
   assert.equal(await root.locator('.po-tier__total').nth(0).textContent(),'€65.98');assert.equal(await root.locator('.po-tier__total').nth(2).textContent(),'Save $9');assert.equal(await root.locator('.po-tier__compare').nth(2).isHidden(),true);checks++;
   await root.evaluate(el=>{el.dataset.currency='JPY';el.dataset.storeCurrency='JPY';el.dataset.moneyFormat='¥{{amount_no_decimals}}';el.dataset.variants=JSON.stringify([{id:'v',price:360000,available:true}]);el.disconnectedCallback();el.connectedCallback();});assert.equal(await root.locator('.po-tier__total').nth(0).textContent(),'¥7,200');checks++;
   await root.evaluate(el=>{el.dataset.currency='RON';el.dataset.storeCurrency='RON';el.dataset.moneyFormat='{{amount_with_comma_separator}} lei';el.dataset.variants=JSON.stringify([{id:'v',price:3600,available:true}]);el.disconnectedCallback();el.connectedCallback();});assert.equal(await root.locator('.po-tier__total').nth(0).textContent(),'72,00 lei');checks++;
   await page.close();
  }
  const page=await browser.newPage();await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:''}));await page.goto('http://preview.test/');
  await page.setContent('<storelib-product-offers data-product-id="p" data-kind="quantity_offer"></storelib-product-offers><storelib-product-offers data-product-id="p" data-kind="bundle"></storelib-product-offers>');
  await page.evaluate(data=>{window.calls=[];window.fetch=async url=>{calls.push(url);return {ok:true,json:async()=>data}};},offers);await page.addScriptTag({content:read('shopify/assets/product-offers.js')});await page.waitForSelector('.po-tier');assert.deepEqual(await page.evaluate(()=>calls),['/api/offers?product=p']);checks++;
  const chart={title:'Sizes',unit:'cm',units:['cm','in'],has_measurements:true,columns:[{name:'Size',measure:false},{name:'Chest',measure:true}],tables:{cm:{rows:[['S','91.44']]},in:{rows:[['S','36']]}},measuring_guide:{text:'Measure chest',image:'https://example.test/guide.jpg'}};
  await page.setContent('<div data-assigned-chart-host><script type="application/json" data-assigned-chart-source></script></div>');await page.locator('[data-assigned-chart-source]').evaluate((el,data)=>{el.dataset.chartJson=JSON.stringify(data);},chart);await page.addScriptTag({content:read('shopify/assets/size-chart.js')});assert.equal(await page.locator('table').count(),2);assert((await page.locator('.mt-size-chart__guide').textContent()).includes('Measure chest'));checks++;
  console.log(checks+' Storelib native-offer, market, upload, standalone block and size-chart checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
