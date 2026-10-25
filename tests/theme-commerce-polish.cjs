// LIQUIDJS=<installed liquidjs path> node tests/theme-commerce-polish.cjs
const fs=require('node:fs'),path=require('node:path'),Module=require('module'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const source=read('tests/theme-empty-block-previews.cjs'),filename=path.join(__dirname,'theme-empty-block-previews.cjs');
const helper=new Module(filename,module);helper.filename=filename;helper.paths=module.paths;
helper._compile(source.slice(0,source.indexOf('(async()=>{'))+'\nmodule.exports={engine,schema,clean};',filename);
const {engine,schema,clean}=helper.exports;
const render=(file,context)=>engine.parseAndRender(clean(read('snippets/'+file+'.storelib')),context,{globals:context});
(async()=>{
 let checks=0;
 for(const f of ['main-product','featured-product'])for(const model of [schema('sections/'+f+'.storelib'),schema('sections/'+f+'.storelib').shopify]){
  assert(!model.blocks.some(b=>b.type==='size_chart_popup'));
  assert(model.blocks.some(b=>b.type==='size_guide')&&model.blocks.some(b=>b.type==='size_table'));
  const bundle=model.blocks.find(b=>b.type==='bundle');assert.equal(bundle.settings[0].content||bundle.settings[0].label,'Products');
  for(const type of ['bundle','upsell_pro','quantity_offer'])for(const value of ['soft','minimal'])assert(model.blocks.find(b=>b.type===type).settings.find(s=>s.id==='style').options.some(o=>o.value===value));checks++;
 }
 const chart={name:'Assigned chart',unit:'cm',columns:['Size','Chest','EU size'],rows_cm:[['S','86–91','38'],['M','92–97','40']],rows_in:[['S','33.9–35.8','38'],['M','36.2–38.2','40']]};
 const product={id:'p',metafields:{storelib:{size_chart:{value:chart}}}},block={id:'guide',type:'size_guide',settings:{size_guide_content:'Wrong chart',size_guide_label:'Size guide'}},section={id:'main',blocks:[block]},settings={size_trigger:'Size'};
 const context={product,block,section,settings,request:{design_mode:true},pages:{}};
 const guide=await render('size-guide-sheet',context);assert(guide.includes('Assigned chart'));assert(!guide.includes('Wrong chart'));checks++;
 const duplicate=await render('size-guide-sheet',{...context,block:{id:'variants',type:'variant_picker',settings:{}}});assert(!duplicate.includes('<dialog'),'explicit chart suppresses the picker guide');checks++;
 const table=await render('size-table-render',{...context,block:{id:'table',settings:{table_data:'Wrong fallback'}}});assert(table.includes('Assigned chart'));assert(!table.includes('Wrong fallback'));checks++;
 const emptyReview=await render('review-sold-block',{...context,block:{id:'review',type:'review_and_sold',settings:{show_review:true,show_sold_products:true}},product:{metafields:{}}});assert(emptyReview.includes('materia-block-preview'));assert(!emptyReview.includes('<sold-product'));checks++;
 const review=await render('review-sold-block',{...context,block:{id:'review',settings:{show_review:true,show_sold_products:true,sold_label:'sold'}},product:{metafields:{reviews:{rating:{value:{rating:4.7}},rating_count:{value:12}},custom:{sold_count:{value:34}}}}});assert(review.includes('4.7 / 5'));assert(review.includes('34 sold'));checks++;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:900}});
  await page.route('http://preview.test/**',route=>route.fulfill({contentType:'text/html',body:''}));await page.goto('http://preview.test/');
  await page.setContent('<div class="shopify-section"><input type="radio" name="options[Size]" value="S" checked><input type="radio" name="options[Size]" value="M">'+guide+'</div>');
  await page.addScriptTag({content:read('shopify/assets/size-chart.js')});
  assert.equal(await page.locator('tr[aria-current=true]').count(),2);
  await page.locator('input[name="options[Size]"][value=M]').check();assert((await page.locator('tr[aria-current=true]').first().textContent()).startsWith('M'));checks++;
  await page.locator('dialog').evaluate(el=>el.showModal());
  await page.locator('.mt-size-chart__units label').filter({has:page.locator('input[value=in]')}).click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('materia:size-chart-unit')),'in');
  assert.equal(await page.locator('table[data-unit=cm]').isVisible(),false);assert.equal(await page.locator('table[data-unit=in]').isVisible(),true);checks++;
  await page.setContent('<style>body{margin:0}.facets__layout{display:grid;grid-template-columns:260px 1fr;height:1500px;align-items:start}.facets__results{height:200px}.facets-panel{height:1300px}</style><facets-root class="facets facets--vertical"><div class="facets__layout"><div class="facets-panel facets-panel--vertical" data-facets-panel></div><div class="facets__results">Products</div></div><span class="facets-group__count">1</span></facets-root>');
  await page.addStyleTag({content:read('shopify/assets/collection-page.css')});
  const collection=read('shopify/assets/collection.js');await page.addScriptTag({content:collection.slice(collection.indexOf('(function facets()'))});
  await page.locator('[data-facets-panel]').evaluate(el=>el.style.height='1300px');
  await page.waitForTimeout(80);await page.evaluate(()=>window.scrollTo(0,450));await page.waitForTimeout(80);
  assert(await page.locator('facets-root').evaluate(el=>el.hasAttribute('data-facets-sticky-results')));
  const y=await page.locator('.facets__results').evaluate(el=>el.getBoundingClientRect().top);assert(y>=0&&y<100);checks++;
  const badge=await page.locator('.facets-group__count').boundingBox();assert.equal(badge.width,badge.height);checks++;
  await page.setContent('<upsell-pro data-button-text="Add" data-added-text="Added" data-open-drawer="false"><div data-upsell-card><select data-upsell-variant><option value="a" data-price="100">A</option><option value="b" data-price="200">B</option></select><button data-upsell-add><span data-label>Add</span></button></div></upsell-pro>');
  await page.evaluate(()=>{window.fetch=async()=>({ok:true,json:async()=>({})});});
  await page.addScriptTag({content:read('shopify/assets/product-offers.js')});
  await page.locator('[data-upsell-add]').click();await page.waitForTimeout(1900);assert.equal(await page.locator('[data-label]').textContent(),'Added');checks++;
  await page.locator('[data-upsell-variant]').selectOption('b');assert.equal(await page.locator('[data-label]').textContent(),'Add');
  await page.locator('[data-upsell-variant]').selectOption('a');assert.equal(await page.locator('[data-label]').textContent(),'Added');checks++;
  await page.evaluate(()=>document.dispatchEvent(new CustomEvent('cart:updated',{detail:{cart:{items:[]}}})));assert.equal(await page.locator('[data-label]').textContent(),'Add');checks++;
  console.log(`${checks} commerce presets, assigned charts, review data, sticky results and persistent upsell checks passed`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
