// Load the actual global priority rules, not only isolated section styles.
const fs=require('fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {engine}=require('./theme-featured-product-round5.cjs');
const read=f=>fs.readFileSync(f,'utf8'),schema=JSON.parse(read('sections/banner3.storelib').split('<schema>')[1].split('</schema>')[0]).shopify;
const clean=s=>s.split('<schema>')[0].replace(/^<template compat="shopify">/,'').replace(/<\/template>\s*$/,'');
const defaults=b=>Object.fromEntries(b.settings.filter(x=>x.id&&'default'in x).map(x=>[x.id,x.default]));
const e=engine();
const theme={theme_font_priority:true,btn_radius:8,btn_font_size:14,btn_font_weight:'500',btn_padding_x:26,btn_padding_y:14};
const rootCSS=':root{--body-font:Arial;--heading-font:Georgia;--btn-font:Verdana;--body-weight:400;--heading-weight:600;--body-font-size:16px;--h2-size:32px;--heading-text-transform:lowercase;--heading-letter-spacing:1px;--color-background:#151515;--color-heading:#eeeeee;--color-text:#cccccc;--btn-primary-bg-color:#dddddd;--btn-primary-color:#111111}body{margin:0}';
const computed=el=>{const s=getComputedStyle(el);return {font:s.fontFamily,weight:s.fontWeight,size:s.fontSize,line:s.lineHeight,tracking:s.letterSpacing,transform:s.textTransform,color:s.color,opacity:s.opacity,radius:s.borderRadius,padX:s.paddingLeft,padY:s.paddingTop,border:s.borderTopWidth,borderColor:s.borderTopColor,bg:s.backgroundColor,width:el.getBoundingClientRect().width};};
(async()=>{let checks=0;const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const width of [390,1366])for(const priority of ['on','off']){
  const page=await browser.newPage({viewport:{width,height:900}});
  const render=async(custom,settings={})=>{
   const blocks=schema.blocks.map((b,i)=>({id:'block'+i,type:b.type,settings:{...defaults(b),enable_custom_style:custom,text:'My Mixed Case',label:'Shop now',link:'#target',font:'body',weight:'700',transform:'uppercase',letterspace:.2,lineheight:'1.8',size_d:20,size_m:18,color:'#abcdef',opacity:60,max_width:10,use_theme_button:false,bg:'#224466',text_color:'#ffffff',border_color:'#aa6600',border_width:2,radius:20,pad_h:30,pad_v:12,...settings}}));
   const ctx={settings:theme,section:{id:'promo',settings:{...defaults(schema),reveal:false},blocks}};
   const controls=await e.parseAndRender(clean(read('snippets/theme-controls.storelib')),ctx,{globals:ctx}),banner=await e.parseAndRender(clean(read('sections/banner3.storelib')),ctx,{globals:ctx});
   await page.setContent('<html data-font-priority="'+priority+'" data-button-priority="on"><head><style>'+rootCSS+'</style>'+controls+'</head><body><div class="shopify-section" id="shopify-section-promo">'+banner+'</div></body></html>');
   // Later stylesheets must not defeat explicit block controls either.
   await page.addStyleTag({content:read('shopify/assets/theme-button-contract.css')});
  };
  await render(true);
  for(const type of ['eyebrow','heading','sub']){
   const el=page.locator('.rm-hero__'+type),s=await el.evaluate(computed),size=width<750?18:20;
   assert.equal(s.font,'Arial',type+' body font');assert.equal(s.weight,'700',type+' weight');assert.equal(s.transform,'uppercase',type+' case');assert.equal(s.size,size+'px',type+' size');assert(Math.abs(parseFloat(s.tracking)-size*.2)<.02,type+' tracking');assert(Math.abs(parseFloat(s.line)-size*1.8)<.02,type+' line height');assert.equal(s.color,'rgb(171, 205, 239)');if(type!=='heading')assert.equal(s.opacity,'0.6');checks++;
  }
  let button=await page.locator('.rm-hero__btn').evaluate(computed);assert.equal(button.weight,'700');assert.equal(button.radius,'20px');assert.equal(button.padX,'30px');assert.equal(button.padY,'12px');assert.equal(button.border,'2px');assert.equal(button.bg,'rgb(34, 68, 102)');assert.equal(button.color,'rgb(255, 255, 255)');assert.equal(button.borderColor,'rgb(170, 102, 0)');assert.equal(button.size,(width<750?18:20)+'px');assert.equal(await page.locator('.rm-hero__btn').getAttribute('href'),'#target');checks++;
  for(const weight of ['theme','300','400','500','600','700','800','900']){
   await render(true,{font:'heading',weight});
   for(const type of ['eyebrow','heading','sub']){const s=await page.locator('.rm-hero__'+type).evaluate(computed);assert.equal(s.font,'Georgia',type+' heading font');assert.equal(s.weight,weight==='theme'?'600':weight);checks++;}
  }
  for(const transform of ['none','uppercase','lowercase','capitalize']){await render(true,{transform});for(const type of ['eyebrow','heading','sub']){assert.equal(await page.locator('.rm-hero__'+type).evaluate(el=>getComputedStyle(el).textTransform),transform);checks++;}}
  await render(true,{font:'body',weight:'theme',letterspace:0});for(const type of ['eyebrow','heading','sub']){const s=await page.locator('.rm-hero__'+type).evaluate(computed);assert.equal(s.weight,'400');assert(['normal','0px'].includes(s.tracking));checks++;}
  await page.evaluate(()=>document.documentElement.style.setProperty('--body-weight','500'));for(const type of ['eyebrow','heading','sub']){assert.equal(await page.locator('.rm-hero__'+type).evaluate(el=>getComputedStyle(el).fontWeight),'500');checks++;}
  for(const type of ['heading','sub'])assert((await page.locator('.rm-hero__'+type).getAttribute('style')).includes('10ch'));checks++;
  await render(true,{use_theme_button:true,weight:'700'});button=await page.locator('.rm-hero__btn').evaluate(computed);assert.equal(button.weight,'700');assert.equal(button.radius,'8px');assert.equal(button.padX,'26px');assert.equal(button.size,'14px');checks++;
  await render(false);const h=await page.locator('.rm-hero__heading').evaluate(computed);assert.equal(h.font,'Georgia');assert.equal(h.weight,'600');assert.equal(h.size,'32px');assert.equal(h.transform,'lowercase');for(const type of ['eyebrow','sub']){const s=await page.locator('.rm-hero__'+type).evaluate(computed);assert.equal(s.font,'Arial');assert.equal(s.weight,'400');assert.equal(s.opacity,'1');}checks++;
  await page.evaluate(()=>{document.documentElement.style.setProperty('--body-font','Tahoma');document.documentElement.style.setProperty('--heading-font','Verdana');document.documentElement.style.setProperty('--heading-weight','800');});assert.equal(await page.locator('.rm-hero__heading').evaluate(el=>getComputedStyle(el).fontFamily),'Verdana');assert.equal(await page.locator('.rm-hero__sub').evaluate(el=>getComputedStyle(el).fontFamily),'Tahoma');checks++;
  await page.close();
 }
 console.log(checks+' Promo Banner 3 individual typography, toggle, responsive size and button priority checks passed');
}finally{await browser.close();}})().catch(err=>{console.error(err);process.exitCode=1});
