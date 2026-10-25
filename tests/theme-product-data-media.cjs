// LIQUIDJS=<installed liquidjs path> node tests/theme-product-data-media.cjs
const fs=require('node:fs'),path=require('node:path'),Module=require('module'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const src=read('tests/theme-empty-block-previews.cjs'),filename=path.join(__dirname,'theme-empty-block-previews.cjs');
const helper=new Module(filename,module);helper.filename=filename;helper.paths=module.paths;
helper._compile(src.slice(0,src.indexOf('(async()=>{'))+'\nmodule.exports={engine,clean,schema,defaults};',filename);
const {engine,clean,schema,defaults}=helper.exports;
const render=(name,ctx)=>engine.parseAndRender(clean(read('snippets/'+name+'.storelib')),ctx,{globals:ctx});
(async()=>{
 let checks=0;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:900,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:''}));await page.goto('http://preview.test/');
  const ctx={block:{id:'personal',type:'product_custom_field',settings:{...defaults('product_custom_field'),field_required:true}},section:{id:'source'},product_form_id:'main-form',request:{design_mode:true}};
  const fields=await render('product-personalization',ctx);
  assert(!fields.includes('form-floating'));assert(fields.includes('Enter a name or note'));checks++;
  await page.setContent('<cart-notification><div id="minicart-form"></div></cart-notification><div class="shopify-section" id="shopify-section-source"><div class="product-detail__information">'+fields+'<product-form data-hide-errors="true"><form id="main-form"><input name="id" value="main-variant"><button type="submit" id="main-add">Add</button></form></product-form></div></div><sticky-add-cart data-section-id="source"><product-form data-hide-errors="true"><form><input name="id" value="sticky-variant"><button type="submit" id="sticky-add">Add</button></form></product-form></sticky-add-cart>');
  await page.evaluate(()=>{
   window.PopupBase=class extends HTMLElement{};window.routes={cart_add_url:'/cart/add.js'};window.fetchConfig=()=>({headers:{}});window.publish=()=>{};window.PUB_SUB_EVENTS={cartError:'error',cartUpdate:'update'};
   window.BlsLazyloadImg={init(){}};window.sent=[];
   const cart=document.querySelector('cart-notification');cart.getSectionsToRender=()=>[{id:'minicart-form'}];cart.setActiveElement=()=>{};cart.cartAction=()=>{};cart.open=()=>{};
   window.fetch=async(url,config)=>{
    if(String(url).includes('/cart/add')){
     window.sent.push([...config.body.entries()].map(([key,value])=>({key,value:value instanceof File?{file:true,name:value.name,size:value.size,type:value.type}:value})));
     return {json:async()=>({id:'p',sections:{'minicart-form':'<div id="minicart-form"></div>'}})};
    }return {json:async()=>({item_count:1})};
   };
  });
  const theme=read('shopify/assets/theme.js');await page.addScriptTag({content:theme.slice(theme.indexOf('if (!customElements.get("product-form")) {'),theme.indexOf('// js loadmor product'))});
  await page.locator('#sticky-add').click();assert.equal(await page.evaluate(()=>sent.length),0,'sticky validates the source personalization fields');checks++;
  await page.locator('input[type=text]').fill('Jamie');await page.locator('input[type=file]').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:Buffer.from('photo bytes')});
  await page.locator('#sticky-add').click();await page.waitForTimeout(80);
  const sent=await page.evaluate(()=>sent[0]);
  assert.equal(sent.filter(x=>x.key==='properties[Personalization]').length,1);assert.equal(sent.find(x=>x.key==='properties[Personalization]').value,'Jamie');
  assert.equal(sent.find(x=>x.key==='properties[Upload a photo]').value.name,'photo.png');assert.equal(sent.find(x=>x.key==='id').value,'sticky-variant');checks++;
  await page.locator('#main-add').click();await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>sent[1].filter(x=>x.key==='properties[Upload a photo]').length),1,'form-associated inputs are not appended twice');checks++;
  await page.locator('input[type=text]').evaluate(el=>el.required=false);await page.locator('input[type=text]').fill('');await page.locator('input[type=file]').setInputFiles([]);
  await page.locator('#main-add').click();await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>sent[2].filter(x=>x.key.startsWith('properties[')).length),0,'empty optional fields do not become empty file uploads');checks++;
  const manual=await render('review-sold-block',{block:{id:'review',settings:{show_review:true,show_sold_products:true,review_source:'manual',manual_review_rating:4.8,manual_review_count:23,sold_source:'manual',sold:'17',sold_label:'sold',review_label:'reviews'}}});
  assert(manual.includes('4.8 / 5')&&manual.includes('23 reviews')&&manual.includes('17 sold'));checks++;
  const chart={name:'Assigned chart',unit:'cm',columns:[{key:'size',label:'Size'},{key:'chest',label:'Chest',measurement:true},{key:'eu',label:'EU',measurement:false}],rows:[{size:'S',cells:['86-91','38']}],notes:'<script>window.bad=true</script>'};
  const markup=await render('product-size-chart-content',{product:{id:'p',metafields:{storelib:{size_chart:JSON.stringify(chart)}}},settings:{size_trigger:'Size'}});
  await page.setContent('<div class="shopify-section">'+markup+'</div>');await page.addStyleTag({content:read('shopify/assets/product-page-ui.css')});await page.addScriptTag({content:read('shopify/assets/size-chart.js')});
  assert.equal(await page.locator('th[scope=col]').first().textContent(),'Size');await page.locator('input[value=in]').check();
  assert((await page.locator('table[data-unit=in]').textContent()).includes('33.9–35.8'));assert((await page.locator('table[data-unit=in]').textContent()).includes('38'));assert.equal(await page.evaluate(()=>window.bad),undefined);checks++;
  for(const type of ['size_guide','size_table']){const file=read('blocks/'+type+'.storelib');assert(file.includes("render '"));assert.equal(JSON.parse(file.match(/<schema>\s*([\s\S]*?)\s*<\/schema>/)[1]).shopify.type,type);checks++;}
  const preview=await render('size-chart-preview',{block:{id:'preview',settings:{}},request:{design_mode:true}});await page.setContent(preview);assert(await page.locator('[data-block-preview-root]').isVisible());assert.equal(await page.locator('.product-detail').count(),0);checks++;
  await page.setContent('<div data-mt-lightbox><div data-mt-src="/a.png" style="width:100px;height:100px"><img alt="Image"></div><div class="media-gallery__local-video"><video src="/movie.mp4"></video></div><div class="media-gallery__external-video"><iframe src="https://player.vimeo.com/video/123?controls=0"></iframe></div></div>');
  await page.addStyleTag({content:read('shopify/assets/product-page-ui.css')});
  await page.evaluate(()=>{HTMLMediaElement.prototype.pause=function(){this.dataset.pauseCount=String(+(this.dataset.pauseCount||0)+1);};});
  await page.addScriptTag({content:read('shopify/assets/product-page-ui.js')});
  await page.locator('[data-mt-src]').click();await page.waitForTimeout(60);assert.equal(await page.locator('.mt-lb__slide').count(),3);assert.equal(await page.locator('.mt-lb__slide video').count(),1);checks++;
  await page.locator('.mt-lb__next').click();await page.waitForTimeout(500);assert.equal(await page.locator('.mt-lb__count').textContent(),'2 / 3');assert.equal(await page.locator('.mt-lb video').getAttribute('controls'),'');checks++;
  await page.locator('.mt-lb__next').click();await page.waitForTimeout(500);assert((await page.locator('.mt-lb iframe').getAttribute('src')).includes('controls=1'));checks++;
  await page.locator('.mt-lb__close').click();await page.waitForTimeout(400);assert.equal(await page.locator('.mt-lb').evaluate(el=>el.open),false);assert.equal(await page.$eval('html',el=>el.classList.contains('mt-lock')),false);checks++;
  await page.locator('[data-mt-expand-video]').first().click();await page.waitForTimeout(80);assert.equal(await page.locator('.mt-lb__count').textContent(),'2 / 3');checks++;
  await page.evaluate(()=>{document.querySelector('[data-mt-lightbox]').remove();document.dispatchEvent(new CustomEvent('storelib:section-load'));});await page.waitForTimeout(400);assert.equal(await page.$eval('html',el=>el.classList.contains('mt-lock')),false);checks++;
  assert.deepEqual(errors,[]);console.log(`${checks} personalization payload, chart format/conversion, isolated preview, manual reviews and video-viewer checks passed`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
