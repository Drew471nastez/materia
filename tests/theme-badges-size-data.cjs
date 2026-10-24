const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),Module=require('module'),assert=require('node:assert/strict');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const filename=path.join(__dirname,'theme-product-cards.cjs'),src=read('tests/theme-product-cards.cjs');
const helper=new Module(filename,module);helper.filename=filename;helper.paths=module.paths;
helper._compile(src.slice(0,src.indexOf('(async () => {'))+'\nmodule.exports={renderTemplate,templateOf,config,env,product};',filename);
const h=helper.exports;
const render=(name,ctx)=>h.renderTemplate(h.templateOf(read('snippets/'+name+'.storelib')),{settings:h.config,pages:{},request:{design_mode:false},...ctx},h.env);
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
 try{
  const page=await browser.newPage();
  await page.setContent('<style>:root{--body-weight:500;--btn-primary-bg-color:#112233;--btn-primary-color:#fff;--bages-sale-color:#abcdef;--bages-sale-bg-color:#ff0000;--badges-font-weight:700;--badges-letter-spacing:3px;--badges-transform:uppercase}</style><script type="application/json" data-badge-style-settings>false</script><section style="--badge-background:#123456;--badge-text:#ddeeff"><div class="product__badges"><div class="product__badges-sale product__badges-inner" style="--badges-bg:#000;--badges-color:#000">Sale</div></div></section>');
  await page.addStyleTag({content:read('shopify/assets/product-card.css')});
  await page.addScriptTag({content:read('shopify/assets/product-card-settings.js')});
  const style=()=>page.$eval('.product__badges-inner',el=>{const s=getComputedStyle(el);return[s.backgroundColor,s.color,s.fontWeight,s.textTransform,s.letterSpacing]});
  assert.deepEqual(await style(),['rgb(18, 52, 86)','rgb(221, 238, 255)','500','none','normal']);checks++;
  const toggle=async enabled=>{
   await page.evaluate(enable_custom_badges=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{settings:{enable_custom_badges}}})),enabled);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  };
  await toggle(true);assert.deepEqual(await style(),['rgb(255, 0, 0)','rgb(171, 205, 239)','700','uppercase','3px']);
  await toggle(false);assert.equal((await style())[0],'rgb(18, 52, 86)');checks++;
  const product=h.product(1,{sale:true,new:true});
  product.metafields.custom.custom_product_badge={value:'Limited <edition>'};
  let badges=render('product-badges',{card_product:product,settings:{...h.config,show_sale:true,show_new:true,show_sold_out:true}});
  assert(badges.includes('Limited &lt;edition&gt;'));assert(badges.includes('product__badges-sale'));checks++;
  const unavailable={...product,available:false,has_only_default_variant:false,variants:product.variants.map(v=>({...v,available:false,inventory_management:null}))};
  badges=render('product-badges',{card_product:unavailable,settings:{...h.config,show_sold_out:true}});
  assert(badges.includes('product__badges-sold-out'),'canonical availability wins over missing inventory metadata');checks++;
  const future={...product,created_at:new Date(Date.now()+864e5).toISOString()};
  assert(!render('product-badges',{card_product:future,settings:{...h.config,show_new:true}}).includes('class="product__badges-new'));checks++;
  const block={id:'chart',settings:{use_metafield:true,table_data:'Size | Chest\nFallback | 1'}};
  for(const wrapped of [false,true])for(const [id,size] of [[1,'Small'],[2,'Large']]){
   const value='Size | Chest\n'+size+' | '+id;
   const p={id,metafields:{custom:{size_table:wrapped?{value}:value}}};
   const table=render('size-table-render',{block,product:p});
   assert(table.includes('<td>'+size+'</td>'));assert(!table.includes('Fallback'));assert(table.includes('scope="col"'));checks++;
  }
  assert(render('size-table-render',{block,product:{metafields:{}}}).includes('Fallback'));checks++;
  const chart='<table><tr><td>Product chart</td></tr></table>';
  for(const value of [chart,{value:chart},{content:chart}]){
   const product={metafields:{custom:{size_chart:value}}};
   assert(render('product-size-chart-content',{product}).includes('Product chart'));
   assert(render('size-guide-sheet',{product,block:{id:'guide',settings:{}},section:{id:'main'}}).includes('Product chart'));
   assert(render('size-chart-popup-import',{product,block:{id:'popup',settings:{enable_size_popup:true}}}).includes('Product chart'));checks++;
  }
  const productRef={metafields:{custom:{size_chart:{value:'sizing'}}}},pages={sizing:{content:chart}};
  assert(render('product-size-chart-content',{product:productRef,pages}).includes('Product chart'));checks++;
  assert(!render('size-guide-sheet',{product:{metafields:{}},block:{id:'guide',settings:{}},section:{id:'main'}}).includes('<dialog'));checks++;
  const popup=render('size-chart-popup-import',{product:{metafields:{custom:{size_chart:chart}}},block:{id:'popup',settings:{enable_size_popup:true}}});
  /* The popup is a <dialog> sheet opened by product-page-ui.js and kept in
     place, so a redraw that removes the block removes its dialog and lock. */
  {const sheet=await browser.newPage();
  await sheet.setContent(popup);
  await sheet.addScriptTag({content:read('shopify/assets/product-page-ui.js')});
  await sheet.locator('.scp__trigger').click();await sheet.waitForTimeout(40);
  assert(await sheet.evaluate(()=>document.getElementById('SCDialog-popup').open&&document.documentElement.classList.contains('mt-lock')));
  await sheet.evaluate(()=>{document.getElementById('SC-popup').remove();document.dispatchEvent(new CustomEvent('storelib:section-load'));});
  assert.equal(await sheet.locator('#SCDialog-popup').count(),0);
  assert.equal(await sheet.evaluate(()=>document.documentElement.classList.contains('mt-lock')),false);checks++;
  await sheet.close();}
  await page.setContent('<button data-mt-sheet-open aria-controls="test-sheet">Open</button><section id="product"><dialog class="mt-sheet" id="test-sheet"><div class="mt-sheet__panel">Size guide</div></dialog></section>');
  await page.addScriptTag({content:read('shopify/assets/product-page-ui.js')});
  await page.locator('button').click();await page.waitForTimeout(40);
  assert(await page.evaluate(()=>document.documentElement.classList.contains('mt-lock')));
  await page.evaluate(()=>{document.getElementById('product').remove();document.dispatchEvent(new CustomEvent('storelib:section-load'));});
  assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('mt-lock')),false);checks++;
  const live=read('snippets/theme-live.storelib').match(/<script>([\s\S]*?)<\/script>/)[1].replace(/"\{\{[\s\S]*?\}\}"/g,'""').replace(/\{\{[\s\S]*?\}\}/g,'null').replace(/\{%[\s\S]*?%\}/g,'');
  await page.addScriptTag({content:live});
  await page.evaluate(()=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{settings:{body_font_size:19}}})));
  await page.waitForTimeout(40);
  assert.equal(await page.$eval('html',el=>el.style.getPropertyValue('--body-font-size')),'calc(19px * var(--sl-text-scale, 1))','body size is written under Theme settings > Scale');
  await page.evaluate(()=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{section:'local',settings:{body_font_size:99}}})));
  await page.waitForTimeout(40);
  assert.equal(await page.$eval('html',el=>el.style.getPropertyValue('--body-font-size')),'calc(19px * var(--sl-text-scale, 1))','section changes do not mutate global theme state');checks++;
  console.log(`${checks} badge inheritance, live opt-in, authoritative product data and dynamic size-chart checks passed`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
