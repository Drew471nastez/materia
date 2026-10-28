const fs=require('fs'),cp=require('child_process'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {engine}=require('./theme-featured-product-round5.cjs');
const read=f=>fs.readFileSync(f,'utf8'),parse=s=>JSON.parse(s.split('<schema>')[1].split('</schema>')[0]).shopify;
const schema=parse(read('sections/banner3.storelib')),old=parse(cp.execFileSync('git',['show','HEAD:sections/banner3.storelib'],{encoding:'utf8'}));
const defaults=x=>Object.fromEntries(x.settings.filter(x=>x.id&&'default'in x).map(x=>[x.id,x.default]));
const ids=x=>x.settings.filter(x=>x.id).map(x=>x.id);
const source=read('sections/banner3.storelib').split('<schema>')[0].replace(/^<template compat="shopify">/,'').replace(/<\/template>\s*$/,'');
(async()=>{let checks=0;for(const id of ids(old))assert(ids(schema).includes(id));for(const block of old.blocks)for(const id of ids(block))assert(ids(schema.blocks.find(x=>x.type===block.type)).includes(id));checks++;
 for(const model of [schema,...schema.blocks])assert.equal(new Set(ids(model)).size,ids(model).length);checks++;
 assert.deepEqual(schema.settings.filter(x=>x.type==='header').map(x=>x.content),['Layout','General','Style & Colors','Animation & Behavior','Layout & Spacing','Mobile']);checks++;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const width of [390,1366])for(const custom of [false,true]){
  const settings={...defaults(schema),enable_custom_style:custom,section_width:'full_width',text_align:'right',section_padding_top:12,section_padding_bottom:16,section_pad_left:24,section_pad_right:40,section_pad_left_mobile:8,section_pad_right_mobile:20,bg_color:'#234567',section_bg_color:'#123456',section_border_radius:18};
  const blocks=schema.blocks.map((b,i)=>({type:b.type,id:'b'+i,settings:{...defaults(b),enable_custom_style:custom,color:'#abcdef',weight:'700',size_d:42,size_m:24,use_theme_button:false,bg:'#224466',text_color:'#ffffff',radius:14,pad_h:22,pad_v:10,border_width:2}}));
  const ctx={settings:{},section:{id:'promo',settings,blocks}},e=engine();const html=await e.parseAndRender(source,ctx,{globals:ctx});
  const page=await browser.newPage({viewport:{width,height:900}});await page.setContent('<style>:root{--color-background:#151515;--color-heading:#eeeeee;--color-text:#cccccc;--body-font:Arial;--heading-font:Georgia;--body-font-size:16px;--body-weight:400;--heading-weight:500;--h2-size:32px;--btn-primary-bg-color:#dddddd;--btn-primary-color:#111111;--btn-radius:4px;--btn-font-size:16px}body{margin:0}</style><div id="shopify-section-promo">'+html+'</div>');await page.addStyleTag({content:read('shopify/assets/theme-button-contract.css')});
  const heading=page.locator('.rm-hero__heading'),h=await heading.evaluate(el=>{const s=getComputedStyle(el);return {size:s.fontSize,weight:s.fontWeight,color:s.color,font:s.fontFamily};});
  assert.equal(h.size,custom?(width<750?'24px':'42px'):'32px');assert.equal(h.weight,custom?'700':'500');assert.equal(h.color,custom?'rgb(171, 205, 239)':'rgb(238, 238, 238)');checks++;
  assert.equal(await page.locator('.rm-hero__inner').evaluate(el=>getComputedStyle(el).alignItems),'flex-end');checks++;
  const root=page.locator('.rm-hero'),box=await root.boundingBox();assert.equal(Math.round(box.x),width<750?8:24);assert.equal(Math.round(width-box.x-box.width),width<750?20:40);checks++;
  assert.equal(await page.locator('.rm-promo').evaluate(el=>getComputedStyle(el).paddingTop),'12px');checks++;
  assert.equal(await root.evaluate(el=>getComputedStyle(el).backgroundColor),custom?'rgb(35, 69, 103)':'rgb(21, 21, 21)');checks++;
  const button=page.locator('.rm-hero__btn');assert.equal(await button.getAttribute('href'),'/collections/all');assert.equal(await button.evaluate(el=>getComputedStyle(el).borderRadius),custom?'14px':'4px');checks++;
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
  await page.screenshot({path:'/tmp/materia-promo3-'+width+'-'+custom+'.png'});await page.close();
 }
 console.log(checks+' Promo Banner 3 preserved-setting, schema order, themed/custom block, layout and responsive checks passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
