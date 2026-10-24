const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<style>.custom-red{background:#00ff00 !important;background-image:none !important}</style><test-swatches><input type="radio" checked><label class="product__color-swatches--js product__color-swatch" data-color="red" data-image="/red.png" data-swatch-type="color_swatches"></label><label id="custom" class="product__color-swatches--js product__color-swatch" data-color="red" data-custom-value="custom-red" data-image="/red.png" data-swatch-type="color_swatches"></label></test-swatches>');
  const global=read('shopify/assets/global.js');
  await page.addScriptTag({content:global.slice(global.indexOf('class SwatchInit'),global.indexOf('class DeferredMedia'))+';customElements.define("test-swatches",class extends SwatchInit {});window.paints=0;const real=SwatchInit.prototype.refreshSwatches;SwatchInit.prototype.refreshSwatches=function(t){paints++;return real.call(this,t);};'});
  await page.addScriptTag({content:global.slice(global.indexOf('/* Theme settings > Variant swatches, live in the builder'))});
  assert.equal(await page.$eval('label',el=>el.style.backgroundColor),'red','missing option swatch attribute is safe');checks++;
  await page.evaluate(()=>{for(let i=0;i<200;i++)document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{live:true,settings:{swatch_item_type:'variant_images'}}}));});await page.waitForTimeout(40);
  assert.equal(await page.evaluate(()=>paints),1,'rapid edits batch into one paint per host');assert((await page.$eval('label',el=>el.style.backgroundImage)).includes('red.png'));assert(await page.locator('input').isChecked());checks++;
  assert((await page.$eval('#custom',el=>getComputedStyle(el).backgroundImage)).includes('red.png'),'custom colour CSS cannot override variant-image mode');
  await page.evaluate(()=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{settings:{swatch_item_type:'color_swatches'}}})));await page.waitForTimeout(40);
  assert.equal(await page.$eval('label',el=>el.style.backgroundImage),'');assert.equal(await page.$eval('label',el=>el.style.backgroundColor),'red');checks++;
  assert.equal(await page.$eval('#custom',el=>getComputedStyle(el).backgroundColor),'rgb(0, 255, 0)','custom swatch colour returns in colour mode');
  await page.evaluate(()=>{const host=document.createElement('test-swatches');host.innerHTML='<label class="product__color-swatches--js product__color-swatch" data-color="blue" data-image="/blue.png" data-swatch-type="variant_images"></label>';document.body.append(host);});await page.waitForTimeout(40);
  assert.equal(await page.$eval('test-swatches:last-child label',el=>el.dataset.swatchType),'color_swatches','new AJAX cards inherit the current live setting');checks++;
  await page.evaluate(()=>{const host=document.createElement('late-swatches');host.innerHTML='<label class="product__color-swatches--js product__color-swatch" data-color="blue" data-image="/blue.png" data-swatch-type="variant_images"></label>';document.body.append(host);});
  await page.addScriptTag({content:'customElements.define("late-swatches",class extends SwatchInit {});'});
  assert.equal(await page.$eval('late-swatches label',el=>el.dataset.swatchType),'color_swatches','late custom-element upgrades use the latest preview setting');checks++;

  const root=(id)=>`<facets-root data-section-id="${id}" data-facets-path="/collections/all" data-facets-shape="vertical"><div data-facets-part="filters"><a href="?filter.p.vendor=A" data-facets-link data-facets-param="filter.p.vendor" data-facets-value="A" role="checkbox" aria-checked="false">A</a><a href="?filter.v.option.color=Blue" data-facets-link data-facets-param="filter.v.option.color" data-facets-value="Blue" role="checkbox" aria-checked="false">Blue</a></div><div data-facets-part="results">Products</div></facets-root>`;
  await page.route('https://shop.test/**',route=>route.fulfill({contentType:'text/html',body:root('main')+root('other')}));await page.goto('https://shop.test/collections/all');
  await page.evaluate(()=>{window.requests=[];window.fetch=(url,opts)=>new Promise((resolve,reject)=>{requests.push({url,resolve});opts.signal?.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError')));});});
  const collection=read('shopify/assets/collection.js');await page.addScriptTag({content:collection.slice(collection.indexOf('(function facets()'))});
  await page.locator('facets-root[data-section-id="main"] a').nth(0).click();await page.locator('facets-root[data-section-id="main"] a').nth(1).click();
  const requested=await page.evaluate(()=>requests.map(r=>r.url));const url=new URL(requested[1]);assert.equal(url.searchParams.get('filter.p.vendor'),'A');assert.equal(url.searchParams.get('filter.v.option.color'),'Blue');assert.equal(url.searchParams.get('section_id'),'main');checks++;
  await page.$eval('facets-root[data-section-id="main"]',el=>{el.go(requests[1].url);});assert.equal(await page.evaluate(()=>requests.length),2,'duplicate pending price/filter submits do not send another request');checks++;
  // A second section must not abort or strand the first section's request.
  await page.locator('facets-root[data-section-id="other"] a').nth(0).click();
  await page.evaluate(html=>{requests[1].resolve({ok:true,text:async()=>html});},root('main'));await page.waitForTimeout(30);
  assert.equal(await page.locator('facets-root[data-section-id="main"]').getAttribute('aria-busy'),null);assert.equal(await page.locator('facets-root[data-section-id="other"]').getAttribute('aria-busy'),'true');checks++;
  await page.evaluate(html=>requests[2].resolve({ok:true,text:async()=>html}),root('other'));await page.waitForTimeout(30);
  assert.equal(await page.locator('facets-root[data-section-id="other"]').getAttribute('aria-busy'),null);checks++;
  await page.locator('facets-root[data-section-id="main"] a').first().click();await page.$eval('facets-root[data-section-id="main"]',el=>el.remove());await page.waitForTimeout(20);
  assert.equal(await page.locator('facets-root[data-section-id="main"]').count(),0,'detached editor section does not repaint');checks++;
  // Render backend-native image, RGB and large value facets, not a catalogue
  // reconstructed in the browser. All values remain real links without JS.
  const Module=require('module'),helperPath=path.join(__dirname,'theme-search-collection.cjs'),source=fs.readFileSync(helperPath,'utf8'),helper=new Module(helperPath,module);helper.filename=helperPath;helper.paths=module.paths;
  helper._compile(source.slice(0,source.indexOf('(async () => {'))+'\nmodule.exports={renderTemplate,templateOf,config,stubs};',helperPath);
  const h=helper.exports,env={stubs:h.stubs,files:{},rendered:new Set()};
  const value=(v,extra={})=>({label:v,value:v,count:1,active:false,param_name:'filter.p.m.custom.fabric',url_to_add:'?filter.p.m.custom.fabric='+encodeURIComponent(v),...extra});
  const filters=[{label:'Fabric',type:'list',param_name:'filter.p.m.custom.fabric',values:[value('Cotton',{image:'https://shop.test/cotton.png'}),value('Pattern',{swatch:{image:'https://shop.test/pattern.png'}}),value('RGB',{swatch:{color:'rgb(10, 20, 30)'}})]},{label:'Manufacturer',type:'list',param_name:'filter.p.m.custom.fabric',values:Array.from({length:1500},(_,i)=>value('Brand '+i))}];
  const html=h.renderTemplate(h.templateOf(read('snippets/facets-panel.storelib')),{settings:h.config,section_st:{show_filter_counts:true},section_id:'large',kind:'collection',results:{filters},blocks:[],filter_layout:'vertical',default_filter:'open_all',base_url:'/collections/all',request:{design_mode:false},cart:{currency:{symbol:'€'}}},env);
  await page.setContent(html);assert.equal(await page.locator('.facets-value__image[loading="lazy"][width="28"][height="28"]').count(),2);assert.equal(await page.locator('.facets-value__swatch').count(),1);assert.equal(await page.locator('[data-facets-link][role="checkbox"]').count(),1503);assert.equal(await page.locator('[data-facets-param="filter.p.m.custom.fabric"]').count(),1503);checks++;
  assert.deepEqual(errors,[]);await page.close();console.log(`${checks} batched swatch, redraw, rapid-filter and request-isolation checks passed`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
