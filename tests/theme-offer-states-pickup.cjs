// LIQUIDJS=<installed liquidjs path> node tests/theme-offer-states-pickup.cjs
const fs=require('node:fs'),path=require('node:path'),Module=require('module'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const source=read('tests/theme-empty-block-previews.cjs'),filename=path.join(__dirname,'theme-empty-block-previews.cjs');
const helper=new Module(filename,module);helper.filename=filename;helper.paths=module.paths;
helper._compile(source.slice(0,source.indexOf('(async()=>{'))+'\nmodule.exports={engine,clean,schema,defaults};',filename);
const {engine,clean,schema,defaults}=helper.exports;
const render=(file,ctx)=>engine.parseAndRender(clean(read('snippets/'+file+'.storelib')),ctx,{globals:ctx});
(async()=>{
 let checks=0;
 for(const file of ['main-product','featured-product'])for(const model of [schema('sections/'+file+'.storelib'),schema('sections/'+file+'.storelib').shopify]){
  for(const type of ['bundle','upsell_pro']){
   const a=model.blocks.find(b=>b.type===type).settings.filter(x=>x.type==='header').map(x=>x.content||x.label);
   assert.deepEqual(a.slice(0,2),['Products','Style']);
  }
  assert(model.blocks.find(b=>b.type==='size_guide').settings.some(x=>x.id==='size_guide_display'));checks++;
 }
 const ctx={product:{id:'p',metafields:{storelib:{size_chart:{value:{title:'Measurements',columns:['Size','Chest'],rows:[['S','90']]}}}}},section:{id:'main',blocks:[]},block:{id:'guide',type:'size_guide',settings:{...defaults('size_guide'),size_guide_display:'collapsible'}}};
 const guide=await render('size-guide-sheet',ctx);assert(guide.includes('<details'));assert(!guide.includes('<dialog'));assert(guide.includes('Measurements'));checks++;
 const reviews=await render('review-sold-block',{...ctx,product:{rating:'4.6',review_count:'12',metafields:{custom:{sold_count:{value:20}}}},block:{id:'reviews',settings:{...{...defaults('product_reviews'),...defaults('sold_counter')}}}});
 assert(reviews.includes('4.6 / 5'));assert(reviews.includes('20 sold'));assert(reviews.includes('product-sold__dot'));checks++;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:375,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:''}));await page.goto('http://preview.test/');
  await page.setContent(`<style>body{--color-text:#202020;--color-heading:#111;--color-background:#fff;--color-border:#ccc}</style><upsell-pro class="upsell-pro" data-mode="selected" data-added-text="Added" data-open-drawer="false"><div class="upsell-card" data-upsell-card><input id="choose" class="upsell-card__check" type="checkbox" data-upsell-check checked><label for="choose" class="upsell-card__pick"><span class="upsell-card__box"><svg width="12" height="12"></svg></span></label><div class="upsell-card__info"><select data-upsell-variant><option value="a" data-price="100">Small</option><option value="b" data-price="200">Medium</option></select></div></div><button data-upsell-add-selected><span data-label>Add chosen items</span></button><span data-upsell-total></span><p data-message hidden></p></upsell-pro>`);
  await page.addStyleTag({content:read('shopify/assets/product-offers.css')});
  const colors=await page.locator('.upsell-card__box').evaluate(el=>{const s=getComputedStyle(el);return [s.borderColor,s.backgroundColor,s.color];});assert.notEqual(colors[1],colors[2]);checks++;
  await page.locator('label[for="choose"]').click();const border=await page.locator('.upsell-card__box').evaluate(el=>getComputedStyle(el).borderColor);assert(!border.includes('255, 255, 255'));checks++;
  await page.locator('label[for="choose"]').click();
  await page.evaluate(()=>{window.pending=[];window.fetch=(url,config)=>new Promise(resolve=>window.pending.push({url,config,resolve}));});
  await page.addScriptTag({content:read('shopify/assets/product-offers.js')});
  assert.deepEqual(errors,[]);
  assert(await page.locator('#choose').isChecked());
  assert.equal(await page.locator('[data-upsell-card]').getAttribute('data-variant-id'),'a');
  await page.locator('[data-upsell-add-selected]').click();assert(await page.locator('[data-upsell-add-selected]').isDisabled());
  await page.locator('select').selectOption('b');
  await page.evaluate(()=>window.pending[0].resolve({ok:true,json:async()=>({})}));
  await page.waitForFunction(()=>document.querySelector('[data-upsell-add-selected]').getAttribute('aria-busy')!=='true');
  assert.equal(await page.locator('[data-label]').textContent(),'Add chosen items');
  await page.locator('select').selectOption('a');assert.equal(await page.locator('[data-label]').textContent(),'Added');
  await page.evaluate(()=>document.dispatchEvent(new CustomEvent('cart:updated',{detail:{cart:{items:[]}}})));assert.equal(await page.locator('[data-label]').textContent(),'Add chosen items');checks++;
  await page.setContent('<pickup-availability data-variant-id="a" data-root-url="/"><template><pickup-availability-preview><p>Unable to check pickup</p><button>Retry</button></pickup-availability-preview></template></pickup-availability>');
  await page.evaluate(()=>{window.pending=[];window.fetch=(url,options)=>new Promise(resolve=>window.pending.push({url,options,resolve}));});
  await page.addScriptTag({content:read('shopify/assets/pickup-availability.js')});
  assert.equal(await page.evaluate(()=>window.pending.length),1); // Fetch even without an initial available attribute.
  await page.locator('pickup-availability').evaluate(el=>{el.fetchAvailability('b');});
  assert(await page.evaluate(()=>window.pending[0].options.signal.aborted));
  const response='<div class="shopify-section"><pickup-availability-preview>Current location<button>View pickup</button></pickup-availability-preview><div class="pickup-availability-drawer"><pickup-availability-drawer tabindex="0" role="dialog"><close-button>Close</close-button><a href="#">Location</a></pickup-availability-drawer><div class="overlay"></div></div></div>';
  await page.evaluate(html=>window.pending[1].resolve({ok:true,text:async()=>html}),response);
  await page.waitForFunction(()=>document.querySelector('pickup-availability').hasAttribute('available'));
  await page.evaluate(()=>window.pending[0].resolve({ok:true,text:async()=>'<div>Stale response</div>'}));
  await page.locator('pickup-availability button').click();await page.waitForFunction(()=>document.querySelector('pickup-availability-drawer').classList.contains('open'));
  assert.equal(await page.locator('pickup-availability button').getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('pickup-availability-drawer').hidden);assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'');checks++;
  await page.locator('pickup-availability').evaluate(el=>{el.fetchAvailability('c');});
  await page.evaluate(()=>window.pending[2].resolve({ok:false,status:503}));await page.waitForSelector('pickup-availability button');assert((await page.locator('pickup-availability').textContent()).includes('Unable to check pickup'));checks++;
  await page.locator('pickup-availability button').click();await page.evaluate(()=>window.pending[3].resolve({ok:true,text:async()=>'<div class="shopify-section"></div>'}));await page.waitForFunction(()=>document.querySelector('pickup-availability').children.length===0);assert.equal(await page.locator('pickup-availability-drawer').count(),0);checks++;
  assert.deepEqual(errors,[]);console.log(checks+' offer selection, schema, size guide, review and pickup checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
