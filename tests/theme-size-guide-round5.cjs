// LIQUIDJS=<installed liquidjs path> node tests/theme-size-guide-round5.cjs
// Size guide round 5: every source of sizes (Storelib's chart, rows typed in
// the block, a product custom field, the product's own page for a Featured
// product), every setting of Size guide and Size chart, the retired Size
// Chart Popup placement, the builder-only note, at 375 and 1366 wide.
// LIVE=1 also reads the live product page.
const fs=require('node:fs'),path=require('node:path'),Module=require('module'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const src=read('tests/theme-empty-block-previews.cjs'),filename=path.join(__dirname,'theme-empty-block-previews.cjs');
const helper=new Module(filename,module);helper.filename=filename;helper.paths=module.paths;
helper._compile(src.slice(0,src.indexOf('(async()=>{'))+'\nmodule.exports={engine,clean,schema,branch};',filename);
const {engine,clean,schema,branch}=helper.exports;
const render=(name,ctx)=>engine.parseAndRender(clean(read('snippets/'+name+'.storelib')),ctx,{globals:ctx});
const renderFile=(file,ctx)=>engine.parseAndRender(clean(read(file)),ctx,{globals:ctx});

// The shape Storelib gives (read from the live product page).
const CHART={name:'Tops',unit:'cm',columns:[{name:'Size',measure:false},{name:'Chest',measure:true},{name:'Length',measure:true},{name:'EU',measure:false}],
 rows:[['XS','80-84','64','32'],['S','86-91','66','36'],['M','92-97','68','40'],['L','98-103','70','44'],['XL','104-109','72','48']],
 rows_cm:[['XS','80-84','64','32'],['S','86-91','66','36'],['M','92-97','68','40'],['L','98-103','70','44'],['XL','104-109','72','48']],
 rows_in:[['XS','31.5-33.1','25.2','32'],['S','33.9-35.8','26','36'],['M','36.2-38.2','26.8','40'],['L','38.6-40.6','27.6','44'],['XL','40.9-42.9','28.3','48']],
 notes:'Measured flat.',image:null};
const charted={id:'p1',url:'/products/pants-down',metafields:{storelib:{size_chart:{value:CHART}}}};
const plain={id:'p2',url:'/products/plain-tee',metafields:{}};
const ROWS='Size | Chest | Waist | Fit\nS | 86-91 | 71-76 | Slim\nM | 92-97 | 77-82 | Slim\nL | 98-103 | 83-88 | Relaxed';
const sec={id:'main',blocks:[]};
const live={design_mode:false,path:'/products/pants-down'};
const guide=(settings,ctx={})=>render('size-guide-sheet',{block:{id:ctx.id||'g',type:'size_guide',settings,shopify_attributes:'data-block-id="'+(ctx.id||'g')+'"'},product:charted,section:sec,request:live,settings:{size_trigger:'Size'},pages:{},...ctx});
const table=(settings,ctx={})=>render('size-table-render',{block:{id:ctx.id||'t',type:'size_table',settings,shopify_attributes:''},product:plain,request:{design_mode:false,path:'/products/plain-tee'},settings:{},pages:{},...ctx});
const css=':root{--color-text:#1d1d1d;--color-heading:#0f0f0f;--color-background:#ffffff;--color-border:#e5e5e5;--body-font-size:15px}body{margin:0;padding:0 16px;font:15px/1.5 system-ui;color:var(--color-text);background:#fff}';
const page=(body)=>`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><link rel="stylesheet" href="/assets/product-page-ui.css"></head><body><div class="shopify-section" id="shopify-section-main">${body}</div><script src="/assets/product-page-ui.js"></script><script src="/assets/size-chart.js"></script></body></html>`;

(async()=>{
 let checks=0;
 /* Schemas: the new settings are in both sections and both block files; every old id kept. */
 const oldGuide=['size_guide_label','size_guide_display','size_guide_appearance','size_guide_content','size_guide_page'];
 const oldTable=['use_storelib_chart','title','table_data','use_metafield','metafield_namespace','metafield_key','collapsible','start_open','accent','header_text_color','body_text_color','title_color','border_color','zebra','zebra_color','title_size','cell_size','radius','space_above','space_below'];
 const lists=[];
 for(const file of ['sections/main-product.storelib','sections/featured-product.storelib']){
  const s=schema(file);
  for(const model of [s.shopify,s]){
   lists.push([file,'size_guide',model.blocks.find(b=>b.type==='size_guide').settings]);
   lists.push([file,'size_table',model.blocks.find(b=>b.type==='size_table').settings]);
  }
 }
 for(const type of ['size_guide','size_table']){const s=schema('blocks/'+type+'.storelib');lists.push(['blocks/'+type,type,s.shopify.settings],['blocks/'+type,type,s.settings]);}
 for(const [file,type,settings] of lists){
  const ids=settings.filter(x=>x.id).map(x=>x.id);
  assert.equal(new Set(ids).size,ids.length,file+' '+type+': unique ids');
  for(const id of [...(type==='size_guide'?oldGuide:oldTable),'table_unit','table_data','use_storelib_chart'])assert(ids.includes(id),file+' '+type+': keeps '+id);
  const unit=settings.find(x=>x.id==='table_unit');assert.deepEqual(unit.options.map(o=>o.value),['none','cm','in']);
  for(const x of settings){const words=JSON.stringify([x.label,x.info,x.content]);assert(!/Shopify|Liquid|metafield|—/i.test(words),file+': plain wording '+words);}
  if(type==='size_table')for(const id of ['accent','header_text_color','body_text_color','title_color','border_color','zebra_color'])assert(!('default' in settings.find(x=>x.id===id)),type+' '+id+' follows the scheme');
 }
 checks++;

 /* Sources, rendered */
 const assignedHtml=await guide({size_guide_label:'Size guide',table_data:ROWS,table_unit:'cm',size_guide_content:'<p>Typed text</p>'});
 assert(assignedHtml.includes('Tops')&&!assignedHtml.includes('Typed text')&&!assignedHtml.includes('Relaxed'),'Storelib chart first');
 assert(assignedHtml.includes('<th scope="col">Size</th>')&&assignedHtml.includes('<th scope="col">Chest (cm)</th>')&&assignedHtml.includes('<th scope="col">EU</th>')&&assignedHtml.includes('<th scope="col">Chest (in)</th>'),'units only on measurement columns');
 assert(!assignedHtml.includes('data-size-chart-remote'),'the product page has its chart: nothing to ask');
 const offHtml=await guide({use_storelib_chart:false,table_data:ROWS,table_unit:'cm',size_guide_content:'<p>Typed text</p>'});
 assert(offHtml.includes('Relaxed')&&offHtml.includes('Typed text')&&!offHtml.includes('Tops'),'switch off: the typed rows and text');
 const rowsHtml=await guide({table_data:ROWS,table_unit:'none'},{product:plain,request:{design_mode:false,path:'/products/plain-tee'}});
 assert(rowsHtml.includes('<th scope="row">M</th><td>92-97</td>')&&!rowsHtml.includes('mt-size-chart__units')&&!rowsHtml.includes('materia-chart-preview'),'rows typed in the block, no switch');
 const fieldHtml=await table({use_metafield:true,metafield_key:'size_table',table_data:'Size | X\nFallback | 1'},{product:{...plain,metafields:{custom:{size_table:{value:'Size | Hips\nS | 90'}}}}});
 assert(fieldHtml.includes('<th scope="row">S</th><td>90</td>')&&!fieldHtml.includes('Fallback'),'rows from a custom field');
 const nothingLive=await guide({},{product:plain,request:{design_mode:false,path:'/products/plain-tee'}});
 assert.equal(nothingLive.trim(),'','no sizes: nothing for visitors, not even hidden markup');
 const nothingTable=await table({});assert.equal(nothingTable.trim(),'','size table: nothing for visitors');
 const note=await guide({},{product:plain,request:{design_mode:true,path:'/products/plain-tee'}});
 assert(note.includes('Only you see this box')&&note.includes('Products &gt; Size charts')&&note.includes('Size rows')&&!note.includes('—'),'builder note says where sizes go');
 assert(!note.includes('mt-size-guide"')||note.includes('hidden data-size-chart-await'),'the link waits for sizes in the builder');
 checks++;

 /* Featured product on another page: the remote slot */
 const featuredCtx={product:charted,request:{design_mode:false,path:'/'}};
 const featuredRaw={...charted,metafields:{}};
 const remoteHtml=await guide({size_guide_label:'Size guide'},{id:'fg',product:featuredRaw,request:{design_mode:false,path:'/'}});
 assert(remoteHtml.includes('data-size-chart-remote="/products/pants-down"')&&remoteHtml.includes('hidden data-size-chart-await')&&!remoteHtml.includes('materia-chart-preview'),'featured: asks the product page, hidden until a chart arrives');
 const remoteTable=await table({title:'Sizes'},{id:'ft',product:featuredRaw,request:{design_mode:false,path:'/'}});
 assert(remoteTable.includes('data-size-chart-remote')&&remoteTable.includes('hidden data-size-chart-await'),'featured size table asks too');
 const dataSection=await renderFile('sections/size-chart-data.storelib',{product:charted,settings:{},pages:{}});
 const emptySection=await renderFile('sections/size-chart-data.storelib',{product:plain,settings:{},pages:{}});
 assert(dataSection.includes('data-assigned-chart-host')&&emptySection.includes('data-product="p2"')&&!emptySection.includes('data-assigned-chart-host'));
 checks++;

 /* The retired Size Chart Popup placement: drawn with its own settings */
 const popupBranch=branch('size_chart_popup');
 const popupSettings={trig_text:'Size Guide',underline_text:true,trig_align:'left',show_icon:true,modal_title:'Size Guide',enable_size_popup:true,tab_sizes_label:'Sizes',tab_measure_label:'How to measure',h_a_title:'CHEST',h_a_text:'Measure around the fullest part.',sizes_content:'<br />'};
 const popupHtml=await engine.parseAndRender(popupBranch,{block:{id:'pop',type:'size_chart_popup',settings:popupSettings,shopify_attributes:''},product:charted,section:sec,request:live,settings:{},pages:{}});
 assert(popupHtml.includes('scp__tabs')&&popupHtml.includes('Measure around the fullest part.')&&popupHtml.includes('Chest (cm)')&&popupHtml.includes('scp__trigger--underline'),'popup keeps tabs, How to measure, link style and the Storelib chart');
 checks++;

 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const pages=new Map();let asked=[];
  const sizeTableStyled=await table({title:'Size chart',table_data:ROWS,table_unit:'cm',accent:'#123456',header_text_color:'#ffffff',body_text_color:'#222222',border_color:'#00aa00',zebra:true,zebra_color:'#eeeeee',title_color:'#550000',title_size:20,cell_size:13,radius:4,collapsible:true,start_open:true,space_above:10,space_below:12});
  const sizeTablePlain=await table({title:'Static chart',table_data:ROWS,collapsible:false,zebra:false},{id:'t2'});
  const body=[
   '<fieldset><legend class="form__label">Size</legend><label><input type="radio" name="options[Size]" value="S"> S</label><label><input type="radio" name="options[Size]" value="M" checked> M</label></fieldset>',
   await guide({size_guide_label:'Size guide'},{id:'g1'}),
   await guide({size_guide_label:'Your sizes',use_storelib_chart:false,table_data:ROWS,table_unit:'cm',size_guide_appearance:'button'},{id:'g2'}),
   await guide({size_guide_label:'Sizes row',size_guide_display:'collapsible'},{id:'g3'}),
   sizeTableStyled,sizeTablePlain,
   await guide({size_guide_label:'Featured guide'},{id:'g4',product:featuredRaw,request:{design_mode:false,path:'/'}}),
   await guide({size_guide_label:'No chart guide'},{id:'g5',product:{...plain,url:'/products/plain-tee'},request:{design_mode:false,path:'/'}}),
   popupHtml
  ].join('\n');
  pages.set('/page',page(body));
  for(const [w,h] of [[375,812],[1366,900]]){
   const touch=w<500;
   const ctx=await browser.newContext({viewport:{width:w,height:h},hasTouch:touch,isMobile:touch});
   await ctx.route('http://shop.test/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.startsWith('/assets/'))return route.fulfill({contentType:url.pathname.endsWith('.js')?'text/javascript':'text/css',body:read('shopify/assets/'+url.pathname.slice(8))});
    if(url.pathname.startsWith('/products/')){asked.push(url.pathname+url.search);
     const sectionHtml=url.pathname==='/products/pants-down'?dataSection:emptySection;
     return route.fulfill({contentType:'text/html',body:'<div id="shopify-section-size-chart-data" class="shopify-section">'+sectionHtml+'</div>'});}
    if(pages.has(url.pathname))return route.fulfill({contentType:'text/html',body:pages.get(url.pathname)});
    return route.fulfill({contentType:'text/html',body:''});
   });
   const tab=await ctx.newPage();const errors=[];tab.on('pageerror',e=>errors.push(e.message));
   asked=[];
   await tab.goto('http://shop.test/page');await tab.waitForTimeout(300);
   const tap=async loc=>{touch?await loc.tap():await loc.click();await tab.waitForTimeout(420);};
   const noSideScroll=()=>tab.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
   assert(await noSideScroll(),w+': no sideways page scroll');

   // 1. Storelib chart in the sheet, unit switch, selected size marked, sticky size column
   const t1=tab.locator('[aria-controls="SizeGuide-main-g1"]');
   assert((await t1.boundingBox()).height>=44,w+': link is a 44px target');
   await tap(t1);
   const d1=tab.locator('#SizeGuide-main-g1');
   assert(await d1.evaluate(d=>d.open),w+': the sheet opens');
   assert.equal(await d1.locator('tr[aria-current=true] th').first().textContent(),'M',w+': chosen size marked');
   assert(await d1.locator('table[data-unit=cm]').isVisible()&&!(await d1.locator('table[data-unit=in]').isVisible()),w+': cm first');
   await tap(d1.locator('.mt-size-chart__units label').nth(1));
   assert(await d1.locator('table[data-unit=in]').isVisible()&&!(await d1.locator('table[data-unit=cm]').isVisible()),w+': in on request');
   assert((await d1.locator('table[data-unit=in] thead').textContent()).includes('Chest (in)'));
   assert((await d1.locator('.mt-size-chart__units label').nth(1).boundingBox()).height>=44,w+': unit buttons 44px');
   const sticky=await d1.locator('.mt-size-chart__scroll[data-unit=in]').evaluate(el=>{const th=el.querySelector('tbody th');const before=th.getBoundingClientRect().left;el.scrollLeft=400;const after=th.getBoundingClientRect().left;return {before,after,scrolls:el.scrollWidth>el.clientWidth,pos:getComputedStyle(th).position};});
   assert.equal(sticky.pos,'sticky',w+': size column held');
   if(sticky.scrolls)assert(Math.abs(sticky.before-sticky.after)<1,w+': size column stays while the table scrolls');
   assert(await noSideScroll(),w+': the table scrolls inside its box only');
   assert((await d1.locator('.mt-sheet__close').boundingBox()).width>=44);
   await tap(d1.locator('.mt-sheet__close'));
   assert.equal(await d1.evaluate(d=>d.open),false,w+': closes');
   // the unit choice is shared: other charts now show in
   assert(await tab.locator('#SizeTable-t table[data-unit=in]').isVisible(),w+': unit choice reaches the other charts');
   await tab.evaluate(()=>{try{localStorage.removeItem('materia:size-chart-unit')}catch(_){}});

   // 2. Typed rows with a cm / in switch, as a button
   const shot=async name=>{if(process.env.SIZE_SHOTS)await tab.screenshot({path:path.join(process.env.SIZE_SHOTS,w+'-'+name+'.png')});};
   const t2=tab.locator('[aria-controls="SizeGuide-main-g2"]');
   assert(await t2.evaluate(el=>el.classList.contains('btn')),w+': button style');
   await tap(t2);
   const d2=tab.locator('#SizeGuide-main-g2');
   await tap(d2.locator('.mt-size-chart__units label').first());
   const cmHead=await d2.locator('table[data-unit=cm] thead').textContent();
   assert(cmHead.includes('Chest (cm)')&&cmHead.includes('Fit')&&!cmHead.includes('Fit (')&&!cmHead.includes('Size ('),w+': typed rows name their unit on number columns only');
   await tap(d2.locator('.mt-size-chart__units label').nth(1));
   await shot('typed-rows-sheet');
   const inRow=await d2.locator('table[data-unit=in] tbody tr').nth(0).textContent();
   assert(inRow.includes('33.9–35.8')&&/28(\.0)?–29\.9/.test(inRow)&&inRow.includes('Slim'),w+': typed cm converted to in: '+inRow);
   await tap(d2.locator('.mt-sheet__close'));

   // 3. Collapsible display opens and shuts
   const row=tab.locator('#shopify-section-main details.mt-size-guide-acc');
   const sum=row.locator('summary');
   assert((await sum.boundingBox()).height>=44,w+': row is 44px');
   await tap(sum);assert(await row.evaluate(d=>d.open),w+': row opens');
   assert(await row.locator('.mt-size-chart').isVisible());
   await tap(sum);await tab.waitForTimeout(200);assert.equal(await row.evaluate(d=>d.open),false,w+': row shuts');

   await shot('page');
   // 4. Size chart block settings
   const st=tab.locator('#SizeTable-t');
   const look=await st.evaluate(el=>{const th=el.querySelector('thead th'),td=el.querySelector('tbody td'),even=el.querySelector('tbody tr:nth-child(2) td'),box=el.querySelector('.mt-size-chart__scroll'),title=el.querySelector('summary');
    return {head:getComputedStyle(th).backgroundColor,headText:getComputedStyle(th).color,text:getComputedStyle(td).color,stripe:getComputedStyle(even).backgroundColor,border:getComputedStyle(box).borderTopColor,radius:getComputedStyle(box).borderTopLeftRadius,fs:getComputedStyle(td).fontSize,title:getComputedStyle(title).color,titleFs:getComputedStyle(title).fontSize,open:el.querySelector('details').open,mt:getComputedStyle(el).marginTop};});
   assert.deepEqual(look,{head:'rgb(18, 52, 86)',headText:'rgb(255, 255, 255)',text:'rgb(34, 34, 34)',stripe:'rgb(238, 238, 238)',border:'rgb(0, 170, 0)',radius:'4px',fs:'13px',title:'rgb(85, 0, 0)',titleFs:'20px',open:true,mt:'10px'},w+': every colour and size setting applies');
   const sum2=st.locator('summary');await tap(sum2);await tab.waitForTimeout(200);assert.equal(await st.locator('details').evaluate(d=>d.open),false,w+': size chart shuts');
   await tap(sum2);assert(await st.locator('details').evaluate(d=>d.open),w+': and opens again');
   const plainLook=await tab.locator('#SizeTable-t2').evaluate(el=>({details:!!el.querySelector('details'),stripe:getComputedStyle(el.querySelector('tbody tr:nth-child(2) td')).backgroundColor,bg:getComputedStyle(el.querySelector('tbody tr:nth-child(1) td')).backgroundColor}));
   assert(plainLook.details===false&&plainLook.stripe===plainLook.bg,w+': always open, no stripes when off');

   // 5. Featured product: the chart comes from the product page
   await tab.locator('[aria-controls="SizeGuide-main-g4"]').waitFor({state:'visible',timeout:3000});
   assert(asked.some(u=>u.startsWith('/products/pants-down?section_id=size-chart-data')),w+': asked the product page');
   assert(!asked.some(u=>u.includes('section_id=main')),w+': the data section answered, no second request');
   await tap(tab.locator('[aria-controls="SizeGuide-main-g4"]'));
   const d4=tab.locator('#SizeGuide-main-g4');
   await shot('featured-sheet');
   assert((await d4.textContent()).includes('Tops')&&(await d4.locator('tbody tr').count())>=5,w+': featured shows the product chart');
   await tap(d4.locator('.mt-size-chart__units label').nth(1));
   assert(await d4.locator('table[data-unit=in]').isVisible(),w+': featured unit switch');
   await tap(d4.locator('.mt-sheet__close'));
   await tab.waitForTimeout(200);
   assert(await tab.locator('[aria-controls="SizeGuide-main-g5"]').isHidden(),w+': no chart on the product page: no link');
   assert.equal(asked.filter(u=>u.startsWith('/products/plain-tee')).length,1,w+': asked once');

   // 6. Size Chart Popup placement
   await tap(tab.locator('#SC-pop .scp__trigger'));
   const pop=tab.locator('#SCDialog-pop');
   assert(await pop.evaluate(d=>d.open));
   assert(await pop.locator('.mt-size-chart').isVisible(),w+': popup Sizes tab shows the Storelib chart');
   await shot('popup-sizes');
   await tap(pop.locator('[data-mt-tab]').nth(1));
   await shot('popup-measure');
   assert((await pop.textContent()).includes('Measure around the fullest part.'),w+': How to measure tab');
   await tap(pop.locator('.scp__close'));
   assert.equal(await pop.evaluate(d=>d.open),false);
   assert(await noSideScroll());
   assert.deepEqual(errors,[]);
   await ctx.close();
   checks++;
  }

  // 7. Builder: the note shows, and goes when a Featured product's chart arrives
  {
   const ctx=await browser.newContext({viewport:{width:375,height:800}});
   await ctx.route('http://shop.test/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.startsWith('/assets/'))return route.fulfill({contentType:url.pathname.endsWith('.js')?'text/javascript':'text/css',body:read('shopify/assets/'+url.pathname.slice(8))});
    if(url.pathname.startsWith('/products/'))return route.fulfill({contentType:'text/html',body:url.pathname==='/products/pants-down'?dataSection:emptySection});
    return route.fulfill({contentType:'text/html',body:pages.get(url.pathname)||''});
   });
   pages.set('/builder',page([
    await guide({size_guide_label:'Size guide'},{id:'b1',product:featuredRaw,request:{design_mode:true,path:'/'}}),
    await guide({size_guide_label:'Size guide'},{id:'b2',product:plain,request:{design_mode:true,path:'/products/plain-tee'}})
   ].join('\n')));
   const tab=await ctx.newPage();await tab.goto('http://shop.test/builder');
   await tab.locator('[aria-controls="SizeGuide-main-b1"]').waitFor({state:'visible',timeout:3000});
   assert.equal(await tab.locator('[data-block-preview-root="b1"].materia-chart-preview').count(),0,'builder: the note goes when the chart arrives');
   assert(await tab.locator('[data-block-preview-root="b2"].materia-chart-preview').isVisible(),'builder: the note stays for a product with no chart');
   assert(await tab.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await ctx.close();checks++;
  }

  if(process.env.LIVE&&process.env.LIVE!=='0'){
   const res=await fetch('https://andrewrullz.storelib.com/products/pants-down');const html=await res.text();
   assert(html.includes('data-assigned-chart-host')&&!html.includes('materia-chart-preview'),'live: the product chart is drawn and no builder note');
   checks++;
  }
 }finally{await browser.close();}
 console.log(checks+' size guide round 5 checks passed (sources, settings, featured product chart, retired popup, builder note, 375 and 1366)');
})().catch(e=>{console.error(e);process.exitCode=1});
