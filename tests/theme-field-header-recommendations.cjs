const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const part=(file,tag)=>read(file).match(new RegExp('<'+tag+'[^>]*>([\\s\\S]*?)</'+tag+'>'))[1].replace(/\{%[\s\S]*?%\}/g,'');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent(`<style>:root{--color-text:#223344;--color-background:white}.color-alt{--color-text:#eeeeee;--color-background:#222222}</style><div id="shopify-section-header" class="section-header"><header class="header"><div class="header__inner"><a id="keep">Menu</a></div></header></div><form class="color-alt"><label>Label</label><input id="entry" placeholder="Email" style="--input-color:red"><textarea placeholder="Message"></textarea><div class="mt-select-wrap"><select style="--mt-select-text:red"><option>Option</option></select><svg class="mt-select-wrap__chev"><path/></svg></div></form>`);
  await page.addStyleTag({content:read('shopify/assets/theme-button-contract.css')});
  await page.addStyleTag({content:'.color-alt { color:var(--color-text); background:var(--color-background); }'});
  const css=(selector,property)=>page.$eval(selector,(el,p)=>getComputedStyle(el).getPropertyValue(p),property);
  assert.equal(await css('#entry','color'),'rgb(238, 238, 238)','default field text follows the local scheme, not a hard-coded input color');checks++;
  const live=part('snippets/theme-live.storelib','script').replace(/"\{\{[\s\S]*?\}\}"/g,'""').replace(/\{\{[\s\S]*?\}\}/g,'null');
  await page.addScriptTag({content:live});
  const apply=async settings=>{await page.evaluate(settings=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{settings,live:true}})),settings);await page.waitForTimeout(40);};
  await apply({field_text:'#5588aa'});
  for(const selector of ['#entry','textarea','.mt-select-wrap__chev'])assert.equal(await css(selector,'color'),'rgb(85, 136, 170)');
  // A picker's own text colour (--mt-select-text, variant picker settings) stays its own.
  assert.equal(await css('select','color'),'rgb(255, 0, 0)');
  assert.equal(await page.$eval('#entry',el=>getComputedStyle(el,'::placeholder').color),'rgb(85, 136, 170)');
  assert.equal(await css('label','color'),'rgb(238, 238, 238)','field override does not recolor labels against their section background');checks++;
  await page.addStyleTag({content:':root { --field-text-override:#ff00ff; }'});
  await apply({field_text:''});assert.equal(await css('#entry','color'),'rgb(238, 238, 238)','clearing the picker overrides even the original saved CSS');checks++;
  let dimensions=part('snippets/header-dimensions.storelib','style').replace(/\{\{\s*section.id\s*\}\}/g,'header').replace(/\{\{[\s\S]*?\}\}/g,'64');
  // The heights the snippet prints, the bar rules in header-layout.css and the slider drag in header-section.js.
  await page.$eval('#shopify-section-header',el=>el.classList.add('shopify-section'));
  await page.addStyleTag({content:read('shopify/assets/header-layout.css')+dimensions});await page.addScriptTag({content:read('shopify/assets/header-section.js')});
  await page.evaluate(()=>{window.kept=document.querySelector('#keep');for(let i=0;i<100;i++)document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{settings:{header_height:120,header_height_mobile:80},live:true}}));});
  await page.waitForTimeout(40);assert.equal(await css('header','height'),'80px');assert(await page.evaluate(()=>kept===document.querySelector('#keep')));checks++;
  await page.setViewportSize({width:1280,height:900});assert.equal(await css('header','height'),'120px');checks++;
  await page.close();
  const carousel=await browser.newPage({viewport:{width:390,height:844}});
  await carousel.setContent(`<div id="minicart_wrapper"><slide-section class="swiper swiper-cart-upsell" data-mobile="1" data-desktop="1" data-tablet="1"><div class="swiper-wrapper"><div class="swiper-slide">A</div></div><div class="cart-recommend__nav"><button class="cart-recommend__arrow swiper-button-prev"></button><div class="swiper-pagination"></div><button class="cart-recommend__arrow swiper-button-next"></button></div></slide-section></div>`);
  await carousel.addStyleTag({content:read('shopify/assets/swiper-bundle.min.css')+read('shopify/assets/materia-experience.css')});await carousel.addScriptTag({content:read('shopify/assets/swiper-bundle.min.js')});
  const global=read('shopify/assets/global.js');await carousel.addScriptTag({content:global.slice(global.indexOf('class SlideSection'),global.indexOf('class PopupBase'))});
  assert.equal(await carousel.locator('.cart-recommend__nav').isVisible(),false,'single product reserves no navigation space');checks++;
  await carousel.$eval('slide-section',el=>{el.globalSlide.appendSlide('<div class="swiper-slide">B</div>');el.globalSlide.update();});
  await carousel.waitForTimeout(60);
  assert.equal(await carousel.locator('.cart-recommend__nav').isVisible(),true);assert.equal(await carousel.locator('.cart-recommend__arrow').first().isVisible(),false);checks++;
  await carousel.addScriptTag({content:read('shopify/assets/materia-experience.js')});
  const mode=async value=>carousel.evaluate(value=>document.dispatchEvent(new CustomEvent('materia:theme-applied',{detail:{settings:{cart_drawer_recommend_pagination:value}}})),value);
  await mode('progress');assert.equal(await carousel.$eval('slide-section',el=>el.globalSlide.params.pagination.type),'progressbar');assert(await carousel.locator('.swiper-pagination-progressbar').isVisible());checks++;
  await mode('none');assert.equal(await carousel.locator('.cart-recommend__nav').isVisible(),false);checks++;
  await mode('dots');assert.equal(await carousel.locator('.swiper-pagination-bullet').count(),2);assert(await carousel.locator('.cart-recommend__nav').isVisible());checks++;
  assert.deepEqual(errors,[]);await carousel.close();
  const schema=JSON.parse(read('sections/theme-header.storelib').split('<schema>')[1].split('</schema>')[0]).shopify;
  assert(schema.settings.some(s=>s.id==='header_height_mobile'));
  for(const b of schema.blocks.filter(b=>b.type.startsWith('menu_')&&b.type!=='menu_badges')){assert.equal(b.settings[1].id,'text');assert(b.settings[1].info.includes('top-level'));}checks++;
  const menu=read('snippets/horizontal-menu.storelib');assert(menu.includes('assign account_signed_in = customer'));assert(menu.includes("template.name == 'account'"));assert(!menu.includes('{{ customer.name }}'));checks++;
  console.log(`${checks} field inheritance, live header sizing, account schema and compact recommendation checks passed`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
