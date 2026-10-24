const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
 try {
  const page=await browser.newPage();
  await page.setContent('<style>button{width:320px;height:54px}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}</style><body><section id="main"><button name="add" class="product-form__submit" data-theme-button="primary"><svg class="btn-icon hidden-on-load" aria-hidden="true" width="18" height="18"></svg><span class="hidden-on-load">Add to cart</span><svg class="icon-load spin" width="14" height="14"></svg></button></section><section id="featured"><button name="add" class="product-form__submit" data-theme-button="primary"><svg class="btn-icon" aria-hidden="true" width="18" height="18"></svg><span class="hidden-on-load">Add to cart</span><svg class="icon-load spin" width="14" height="14"></svg></button></section><section id="card"><button name="add" class="product-item__button-submit" data-theme-button="primary"><svg class="icon-cart" aria-hidden="true" width="18" height="18"></svg><span class="hidden-on-load">Add to cart</span><svg class="icon-load spin" width="14" height="14"></svg></button></section></body>');
  for(const f of ['theme-button-contract.css','materia-experience.css'])await page.addStyleTag({content:read('shopify/assets/'+f)});
  for(const id of ['main','featured','card']){
   const original=await page.$eval('#'+id+' button',el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height}));
   await page.$eval('#'+id+' button',el=>el.classList.add('loading'));
   const state=await page.$eval('#'+id+' button',el=>{
    const icon=el.querySelector('.btn-icon,.icon-cart'),spinner=el.querySelector('.icon-load');
    const b=el.getBoundingClientRect(),s=spinner.getBoundingClientRect();
    return {icon:getComputedStyle(icon).visibility,spinner:getComputedStyle(spinner).display,opacity:getComputedStyle(spinner).opacity,w:b.width,h:b.height,x:s.x+s.width/2-(b.x+b.width/2),y:s.y+s.height/2-(b.y+b.height/2),animation:getComputedStyle(spinner).animationName,label:getComputedStyle(el.querySelector('span')).visibility};
   });
   assert.equal(state.icon,'hidden');assert.notEqual(state.spinner,'none');assert.equal(state.opacity,'1');
   assert(Math.abs(state.x)<.5&&Math.abs(state.y)<.5,'spinner stays centred, independent of the hidden icon');
   assert.equal(state.w,original.w);assert.equal(state.h,original.h);assert.equal(state.animation,'spin');assert.equal(state.label,'visible','label remains available to assistive technology');checks++;
   await page.$eval('#'+id+' button',el=>el.classList.remove('loading'));
   assert.equal(await page.$eval('#'+id+' .btn-icon, #'+id+' .icon-cart',el=>getComputedStyle(el).visibility),'visible','icon returns after success or failure');checks++;
  }
  await page.evaluate(()=>document.documentElement.classList.add('open-minicart'));
  await page.$eval('#main button',el=>el.classList.add('loading'));
  assert.notEqual(await page.$eval('#main .icon-load',el=>getComputedStyle(el).display),'none');
  await page.$eval('#main button',el=>el.classList.remove('loading'));
  assert.equal(await page.$eval('#main .icon-load',el=>getComputedStyle(el).display),'none');checks++;
  assert(read('snippets/buy-buttons.storelib').includes('class="btn-icon hidden-on-load"'));
  console.log(`${checks} add-to-cart loading icon and layout checks passed`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
