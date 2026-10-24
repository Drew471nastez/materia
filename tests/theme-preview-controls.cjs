const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),Module=require('module'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
// Reuse the real-template fixture renderer, without starting its test server.
const helperPath=path.join(__dirname,'theme-search-collection.cjs'),helperSource=fs.readFileSync(helperPath,'utf8');
const helper=new Module(helperPath,module);helper.filename=helperPath;helper.paths=module.paths;
helper._compile(helperSource.slice(0,helperSource.indexOf('(async () => {'))+'\nmodule.exports={renderTemplate,templateOf,sectionSettings,config,stubs,shop,themeRoot};',helperPath);
const h=helper.exports,env={stubs:h.stubs,files:{},rendered:new Set()};
const renderCollection=({editor=false,extras=false,filters=true,enabled=true}={})=>{
 const sectionFile='sections/main-collection-product.storelib',data=h.shop('https://shop.test/collections/all','collection');
 const settings=h.sectionSettings(sectionFile,{enable_filtering:enabled,filter_layout:'vertical',default_filter:'open_all'});
 const collection={title:'All products',url:'/collections/all',products:data.results,products_count:data.results.length,filters:filters?data.filters:[],sort_options:[],sort_by:null};
 return h.renderTemplate(h.templateOf(read(sectionFile)),{settings:h.config,section:{id:'preview-test',settings,blocks:extras?[{id:'text',type:'html',settings:{title:'Sidebar information',content:'Collection details'}}]:[]},collection,collections:{},request:{design_mode:editor,locale:{iso_code:'en'},host:'shop.test'},routes:{all_products_collection_url:'/collections/all'},cart:{currency:{symbol:'€'}},template:'collection',pages:{},content_for_header:'',__page:1,__url:"https://shop.test/collections/all"},env);
};
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const editor of [false,true]){
   await page.setContent(renderCollection({editor,extras:true,filters:false}));
   assert.equal(await page.locator('[data-facets-panel]').count(),1,'sidebar blocks survive absent facet data');
   assert((await page.locator('[data-facets-panel]').textContent()).includes('Sidebar information'));
   assert.equal(await page.locator('.facets-preview-notice').count(),editor?1:0);checks++;
  }
  await page.setContent(renderCollection({editor:true,filters:false}));assert.equal(await page.locator('.facets-price__input').count(),0,'missing backend facets are never fabricated');assert.equal(await page.locator('.facets-preview-notice').count(),1);checks++;
  await page.setContent(renderCollection({editor:true,enabled:false}));assert.equal(await page.locator('[data-facets-panel]').count(),0,'disabled filter setting remains respected');checks++;
  for(const editor of [false,true])for(const width of [1280,375]){
   await page.setViewportSize({width,height:900});await page.setContent('<style>'+h.themeRoot()+'</style>'+renderCollection({editor}));
   for(const f of ['critical.css','theme.css','collection-page.css','theme-button-contract.css'])await page.addStyleTag({content:read('shopify/assets/'+f)});
   const panel=page.locator('[data-facets-panel]');if(width<1025)await panel.evaluate(el=>el.showPopover());
   await page.waitForTimeout(380);
   const input=panel.locator('.facets-price__input').last();assert(await input.isVisible());await input.focus();
   const bounds=await panel.evaluate(el=>{const p=el.getBoundingClientRect(),inputs=[...el.querySelectorAll('.facets-price__input')];return {p:{x:p.x,r:p.right},inputs:inputs.map(i=>{const r=i.getBoundingClientRect();return {x:r.x,r:r.right,scroll:i.closest('form').scrollWidth,w:i.closest('form').clientWidth};})};});
   for(const r of bounds.inputs){assert(r.x>=bounds.p.x+3&&r.r<=bounds.p.r-3,'field and focus ring stay inside the panel');assert(r.scroll<=r.w,'price fields do not overflow their form');}checks++;
  }
  const link=(url,new_tab,legacy_new_tab)=>h.renderTemplate(h.templateOf(read('snippets/link-target.storelib')),{url,new_tab,legacy_new_tab,request:{host:'editor.test'},shop:{domain:'shop.test',url:'https://shop.test',permanent_domain:'canonical.test'}},env).trim();
  for(const url of ['/collections/all','https://shop.test/collections/all','//shop.test/cart','https://canonical.test/products/a','mailto:a@example.test'])assert.equal(link(url,true),'',url+' stays in same tab');
  assert.equal(link('https://outside.test',false),'');assert.equal(link('https://outside.test',true),'target="_blank" rel="noopener noreferrer"');assert.equal(link('https://outside.test',null,true),'target="_blank" rel="noopener noreferrer"');checks++;
  await page.setContent('<style>:root{--body-weight:400;--color-text:#123456;--color-background:#fff;--color-border:#ccc;--btn-border-width:0px}</style><div id="minicart_wrapper" class="open_drawer"><div class="minicart__wrapper"><div class="cart-addons"><div><button class="mini_cart_addon_btn show-overlay">'+h.renderTemplate(h.templateOf(read('snippets/cart-tool-icon.storelib')),{name:'coupon'},env)+'</button></div></div></div></div><div class="slideshow"><div class="swiper-actions"><button class="swiper-arrow" data-ss-arrow><svg/></button></div></div>');
  const sheets=read('snippets/cart-drawer-sheets.storelib').match(/<style[^>]*>([\s\S]*?)<\/style>/)[1];await page.addStyleTag({content:sheets});await page.addStyleTag({content:read('shopify/assets/theme-button-contract.css')});
  assert.equal(await page.$eval('[data-ss-arrow]',el=>getComputedStyle(el).borderTopWidth),'0px');await page.evaluate(()=>document.documentElement.style.setProperty('--btn-border-width','3px'));assert.equal(await page.$eval('[data-ss-arrow]',el=>getComputedStyle(el).borderTopWidth),'3px');checks++;
  const icon=await page.$eval('.cart-tool-icon',el=>({width:el.getBoundingClientRect().width,stroke:getComputedStyle(el).strokeWidth,fill:getComputedStyle(el.querySelector('path')).fill}));assert.equal(icon.width,18);assert.equal(icon.fill,'none');await page.evaluate(()=>document.documentElement.style.setProperty('--body-weight','700'));assert.notEqual(await page.$eval('.cart-tool-icon',el=>getComputedStyle(el).strokeWidth),icon.stroke);checks++;
  assert.deepEqual(errors,[]);await page.close();console.log(`${checks} editor/sidebar, clipping, link-target, arrow-border and cart-icon checks passed`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
