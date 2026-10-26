const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
(async()=>{let checks=0;const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const p=await b.newPage({viewport:{width:390,height:844},hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.setContent('<style>:root{--color-background:#171717;--color-text:#ddd;--color-heading:#fff;--color-border:#444;--body-font-size:16px}</style><button id="open" data-mt-sheet-open aria-controls="chart">Size guide</button><dialog id="chart" class="mt-sheet"><div class="mt-sheet__panel"><div class="mt-sheet__head">Guide<button data-mt-sheet-close>Close</button></div><div class="mt-sheet__body"><div class="mt-size-chart"><div class="mt-size-chart__units"><label><input name="u" type="radio" value="cm" checked>cm</label><label><input name="u" type="radio" value="in">in</label></div><p>Measurements</p></div></div></div></dialog>');
 await p.addStyleTag({content:read('shopify/assets/product-page-ui.css')});await p.addScriptTag({content:read('shopify/assets/product-page-ui.js')});
 await p.locator('#open').click();await p.waitForTimeout(400);
 assert.equal(await p.locator('.mt-sheet__panel').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(23, 23, 23)');checks++;
 const size=await p.locator('.mt-size-chart__units').boundingBox();await p.locator('input[value=in]').check();const after=await p.locator('.mt-size-chart__units').boundingBox();assert.equal(after.height,size.height);assert.equal(after.width,size.width);assert(size.height<60);checks++;
 await p.evaluate(()=>{MateriaProductUi.closeSheet(document.querySelector('dialog'));MateriaProductUi.openSheet(document.querySelector('dialog'),document.querySelector('#open'));});await p.waitForTimeout(500);
 assert(await p.locator('dialog').evaluate(el=>el.open&&el.classList.contains('is-open')),'rapid reopening cancels the old close callback');checks++;
 await p.evaluate(()=>{
  const head=document.querySelector('.mt-sheet__head');
  function touch(type,y){const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:type==='touchcancel'?[]:[{clientX:80,clientY:y}]});head.dispatchEvent(e);}
  touch('touchstart',20);touch('touchmove',140);window.cancelDrag=()=>touch('touchcancel',140);
 });await p.waitForTimeout(30);
 assert((await p.locator('.mt-sheet__panel').getAttribute('style')).includes('120px'),'sheet follows finger translation');await p.evaluate(()=>cancelDrag());await p.waitForTimeout(400);assert(await p.locator('dialog').evaluate(el=>el.open));checks++;
 await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>MateriaProductUi.closeSheet(document.querySelector('dialog')));assert(!await p.locator('dialog').evaluate(el=>el.open));checks++;
 for(const custom of [false,true]){
  await p.locator('body').evaluate(el=>el.innerHTML='<storelib-product-offers data-kind="upsell_pro" data-product-id="main"></storelib-product-offers>');
  await p.evaluate(custom=>{const el=document.querySelector('storelib-product-offers');el.dataset.offers=JSON.stringify({checkoutOffers:[{offerId:'u',offerPriceCents:100,label:'Backend subtitle',product:{id:'extra',title:'Extra',variants:[{id:'a',name:'Small',priceCents:100},{id:'b',name:'Large',priceCents:200}]}}]});el.dataset.options=JSON.stringify({custom_style:custom,custom_picker_height:50,custom_picker_radius:12,custom_picker_width:180,custom_picker_bg:'#123456',show_subtitle:false,add_mode:'selected',preselect:true});window.Shopify={formatMoney:n=>String(n)};},custom);
  // Custom elements from the first iteration already exist: reattach after setting options.
  if(await p.evaluate(()=>!!window.MateriaProductOffers))await p.locator('storelib-product-offers').evaluate(el=>{el.remove();document.body.append(el);});
  else await p.addScriptTag({content:read('shopify/assets/product-offers.js')});
  await p.addStyleTag({content:read('shopify/assets/theme-button-contract.css')+read('shopify/assets/product-offers.css')});await p.waitForTimeout(60);
  assert.equal(await p.locator('.upsell-card__sub').count(),0);assert.equal(await p.locator('.upsell-pro').evaluate(el=>el.style.getPropertyValue('--offer-picker-height')),custom?'50px':'');checks++;
  assert.equal(await p.locator('.po-select select').evaluate(el=>Math.round(el.getBoundingClientRect().height)),custom?50:44,'touch picker honors custom height, with 44px default hit area');checks++;
  if(custom){const style=await p.locator('.po-select select').evaluate(el=>{const s=getComputedStyle(el);return {radius:s.borderRadius,bg:s.backgroundColor};});assert.deepEqual(style,{radius:'12px',bg:'rgb(18, 52, 86)'});checks++;}
 }
 assert.deepEqual(errors,[]);console.log(checks+' dark-sheet, stable units, reopen/cancel-drag, custom native picker and subtitle checks passed');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
