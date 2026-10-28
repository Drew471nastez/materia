// Real sparse settings, theme styles and section asset. Font HTTP is simulated;
// the returned font binary is the theme's real WOFF2, not a CSS-family assertion.
const fs=require('fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {engine}=require('./theme-featured-product-round5.cjs');
const read=f=>fs.readFileSync(f,'utf8'),clean=s=>s.split('<schema>')[0].replace(/^<template compat="shopify">/,'').replace(/<\/template>\s*$/,'');
const saved=Object.entries(JSON.parse(read('templates/home.json')).sections).find(([,s])=>s.type==='hero-benefits');
const schema=JSON.parse(read('sections/hero-benefits.storelib').split('<schema>')[1].split('</schema>')[0]).shopify;
const defaults=m=>Object.fromEntries(m.settings.filter(x=>x.id&&'default'in x).map(x=>[x.id,x.default]));
const css=':root{--body-font:Arial;--heading-font:Georgia;--body-weight:400;--heading-weight:600;--body-font-size:16px;--h2-size:32px;--h3-size:20px;--heading-line-height:1.2;--body-line-height:1.5;--heading-letter-spacing:1px;--heading-text-transform:lowercase;--color-background:#151515;--color-heading:#eee;--color-text:#ccc;--color-primary:#aabbcc;--rounded-radius:8px}body{margin:0}';
const getStyle=(el,key)=>getComputedStyle(el)[key];
(async()=>{let checks=0;const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const width of [375,1366]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://storelib.com/media/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}));
  await page.route('https://fonts.googleapis.com/**',route=>{const family=new URL(route.request().url()).searchParams.get('family').split(':')[0];route.fulfill({contentType:'text/css',body:'@font-face{font-family:'+JSON.stringify(family)+';font-style:normal;font-weight:100 900;font-display:swap;src:url(https://fonts.test/font.woff2) format("woff2");}'});});
  await page.route('https://fonts.test/**',route=>route.fulfill({contentType:'font/woff2',headers:{'Access-Control-Allow-Origin':'*'},body:fs.readFileSync('shopify/assets/InstrumentSans-Regular.woff2')}));
  const section={id:'hero',settings:{...saved[1].settings,use_content_blocks:false,enable_custom_style:false},blocks:saved[1].block_order.map(id=>({id,...saved[1].blocks[id]})).filter(b=>b.type==='benefit')};
  const render=async()=>{
   const ctx={settings:{theme_font_priority:true},request:{design_mode:true},section};const e=engine();e.registerFilter('font_face',font=>{assert.equal(typeof font,'object','Only native font objects can use font_face');return '';});
   const controls=await e.parseAndRender(clean(read('snippets/theme-controls.storelib')),ctx,{globals:ctx});
   const html=await e.parseAndRender(clean(read('sections/hero-benefits.storelib')),ctx,{globals:ctx});
   if(await page.evaluate(()=>!!window.MateriaHeroBenefits)){await page.locator('#shopify-section-hero').evaluate((el,html)=>{el.innerHTML=html;el.dispatchEvent(new CustomEvent('storelib:section-load',{bubbles:true,detail:{sectionId:'hero'}}));},html);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));return;}
   await page.setContent('<html data-font-priority="on"><head><style>'+read('shopify/assets/theme.css')+css+'</style>'+controls+'</head><body><section id="shopify-section-hero" class="shopify-section">'+html+'</section><div id="shopify-section-other" class="shopify-section"><h2>Other section</h2></div></body></html>');
   await page.addScriptTag({content:read('shopify/assets/hero-benefits.js')});
  };
  const emit=async(settings,block)=>{await page.evaluate(({settings,block})=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{section:'hero',block,settings,live:true}})),{settings,block});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
  const style=(selector,key)=>page.locator(selector).first().evaluate((el,key)=>getComputedStyle(el)[key],key);
  await render();assert.equal(await style('.hb__heading','fontFamily'),'Georgia');assert.equal(await style('.hb__heading','fontSize'),'32px');checks++;
  const first=section.blocks[0].id,firstSel='[data-benefit-id="'+first+'"]';
  await emit({enable_custom_style:true,heading_size_desktop:60,heading_size_mobile:30,heading_weight:'800',heading_transform:'uppercase',heading_letter_spacing:3,heading_line_height:1.5,text_color:'#abcdef',section_bg:'#112233',muted_color:'#aabbcc',benefit_title_size:24,benefit_desc_size:18,benefit_title_weight:'700',benefit_title_line_height:1.5,benefit_desc_line_height:2,image_radius:20});
  assert.equal(await style('.hb__heading','fontSize'),width<1024?'30px':'60px');assert.equal(await style('.hb__heading','fontWeight'),'800');assert.equal(await style('.hb__heading','textTransform'),'uppercase');assert.equal(await style('.hb__heading','letterSpacing'),'3px');assert.equal(await style('.hb__heading','lineHeight'),width<1024?'45px':'90px');assert.equal(await style('.hb-outer','backgroundColor'),'rgb(17, 34, 51)');assert.equal(await style('.hb__benefit-title','fontSize'),'24px');assert.equal(await style('.hb__benefit-desc p','fontSize'),'18px');assert.equal(await style('.hb__benefit-desc p','lineHeight'),'36px');assert.equal(await style('.hb__media','borderRadius'),'20px');checks++;
  await emit({enable_custom_fonts:true,heading_font:'assistant_n4',body_font:'open_sans_n4'});
  assert.equal(await style('.hb__heading','fontFamily'),'Assistant, sans-serif');assert.equal(await style('.hb__benefit-title','fontFamily'),'Assistant, sans-serif');assert.equal(await style('.hb__benefit-desc p','fontFamily'),'"Open Sans", sans-serif');
  await page.evaluate(async()=>{await document.fonts.load('400 16px Assistant');await document.fonts.load('400 16px "Open Sans"');await document.fonts.ready;});
  assert(await page.evaluate(()=>[...document.fonts].some(f=>f.family==='Assistant'&&f.status==='loaded')));assert((await page.locator('link[data-hb-font="Assistant"]').getAttribute('href')).includes('wght'));checks++;
  await emit({heading_font_source:'body'});assert.equal(await style('.hb__heading','fontFamily'),'"Open Sans", sans-serif');assert.equal(await style('.hb__benefit-title','fontFamily'),'Assistant, sans-serif');checks++;
  await emit({title_font:'body',title_weight:'500',title_size:28,description_size:20,title_color:'#ff0000',description_color:'#00ff00',icon_color:'#0000ff',icon_size:60,alignment:'center',content_gap:20,text_case:'capitalize',letter_spacing:2,enable_custom_style:true},first);
  assert.equal(await style(firstSel+' .hb__benefit-title','fontFamily'),'"Open Sans", sans-serif');assert.equal(await style(firstSel+' .hb__benefit-title','fontSize'),'28px');assert.equal(await style(firstSel+' .hb__benefit-title','fontWeight'),'500');assert.equal(await style(firstSel+' .hb__benefit-title','textTransform'),'capitalize');assert.equal(await style(firstSel+' .hb__benefit-title','color'),'rgb(255, 0, 0)');assert.equal(await style(firstSel+' .hb__benefit-desc p','color'),'rgb(0, 255, 0)');assert.equal(await style(firstSel+' .hb__benefit-desc p','fontSize'),'20px');assert.equal(await style(firstSel+' .hb__icon','width'),'60px');assert.equal(await style(firstSel+' .hb__icon','color'),'rgb(0, 0, 255)');assert.equal(await style(firstSel,'gap'),'20px');checks++;
  await emit({enable_custom_style:false},first);assert.equal(await style(firstSel+' .hb__benefit-title','fontSize'),'24px');assert.equal(await style(firstSel+' .hb__benefit-title','fontFamily'),'Assistant, sans-serif');assert.equal(await style(firstSel+' .hb__benefit-title','color'),'rgb(171, 205, 239)');checks++;
  await emit({enable_custom_fonts:false,enable_custom_style:false});assert.equal(await style('.hb__heading','fontSize'),'32px');assert.equal(await style('.hb__heading','fontFamily'),'Georgia');assert.equal(await style('.hb__benefit-desc p','fontFamily'),'Arial');assert.equal(await style('.hb-outer','backgroundColor'),'rgb(21, 21, 21)');checks++;
  await page.evaluate(()=>document.documentElement.style.setProperty('--heading-font','Verdana'));assert.equal(await style('.hb__heading','fontFamily'),'Verdana');checks++;
  await emit({padding_top_desktop:100,padding_top_mobile:22,padding_bottom_desktop:120,padding_bottom_mobile:32,text_gap:50,text_gap_mobile:12,benefit_content_gap:0,benefits_gap:0,benefits_columns_desktop:3,benefits_columns_mobile:1,image_height_desktop:500,image_height_mobile:300,gap_columns:80,text_column_width:60,section_margin_top:20,section_margin_bottom:24,image_fit:'contain',heading_align_mobile:'center',heading_align_desktop:'center',image_position:'left'});
  assert.equal(await style('.hb-outer','paddingTop'),width<1024?'22px':'100px');assert.equal(await style('.hb-outer','paddingBottom'),width<1024?'32px':'120px');assert.equal(await style('.hb__text','gap'),width<1024?'12px':'50px');assert.equal(await style('.hb__benefit','gap'),'0px');assert.equal(await style('.hb__benefits','gap'),'0px');assert.equal((await style('.hb__benefits','gridTemplateColumns')).split(' ').length,width<1024?1:3);assert.equal(await style('.hb__media','height'),width<1024?'300px':'500px');assert.equal(await style('.hb-outer','marginTop'),'20px');assert.equal(await style('.hb__heading','textAlign'),'center');if(width>=1024)assert.equal(await style('.hb__grid','flexDirection'),'row-reverse');checks++;
  await emit({enable_fade:true,fade_size:40,fade_color:'#ff0000'});assert.equal(await page.locator('.hb__media').evaluate(el=>getComputedStyle(el,'::before').display),'block');assert((await page.locator('.hb__media').evaluate(el=>getComputedStyle(el,'::before').backgroundImage)).includes('255, 0, 0'));checks++;
  await emit({enable_fade:false});assert.equal(await page.locator('.hb__media').evaluate(el=>getComputedStyle(el,'::before').display),'none');checks++;
  await page.addStyleTag({content:'#shopify-section-hero{margin-top:90px;margin-bottom:80px}.color-night{--color-background:#010203;--color-heading:#abcdef}'});await emit({reset_spacing:true});assert.equal(await style('#shopify-section-hero','marginTop'),'0px');await emit({reset_spacing:false});assert.equal(await style('#shopify-section-hero','marginTop'),'90px');checks++;
  await emit({color_scheme:'night'});assert(await page.locator('.hb-outer').evaluate(el=>el.classList.contains('color-night')));assert.equal(await style('.hb-outer','backgroundColor'),'rgb(1, 2, 3)');checks++;
  await page.evaluate(()=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{section:'other',settings:{enable_custom_style:true,heading_size_mobile:59}}})));assert.equal(await style('.hb__heading','fontSize'),'32px');assert.equal(await style('#shopify-section-other h2','fontFamily'),'Verdana');checks++;
  // Reproduce redraws containing custom CSS; turning it off must remove its
  // effect even if the old stylesheet still contains explicit block variables.
  section.settings={...defaults(schema),enable_custom_style:true,enable_custom_fonts:true,heading_font:{family:'Tahoma'},body_font:{family:'Verdana'}};
  section.blocks[0].settings={...section.blocks[0].settings,enable_custom_style:true,title_size:30,title_color:'#ff0000'};
  await render();await emit({enable_custom_style:false},first);assert.equal(await style(firstSel+' .hb__benefit-title','fontSize'),'18px');assert.equal(await style('.hb__heading','fontFamily'),'Tahoma, sans-serif');assert.equal(await style('.hb__benefit-desc p','fontFamily'),'Verdana, sans-serif');checks++;
  await page.locator('[data-hero-benefits]').evaluate(root=>root.dataset.heroSettings=JSON.stringify({enable_custom_style:true,heading_size_mobile:25,heading_size_desktop:55}));await page.waitForFunction(size=>getComputedStyle(document.querySelector('.hb__heading')).fontSize===size,width<1024?'25px':'55px');checks++;
  await emit({enable_custom_fonts:true,enable_custom_style:true,heading_font_source:'heading'});
  for(const option of schema.settings.find(s=>s.id==='heading_font').options){
    await emit({heading_font:option.value,body_font:option.value});
    const expected=option.value==='theme_heading'?'Verdana':option.value==='theme_body'?'Arial':option.label;
    const actual=(await style('.hb__heading','fontFamily')).replaceAll('"','').split(',')[0];assert.equal(actual,expected,option.value);
    assert.equal((await style('.hb__benefit-desc p','fontFamily')).replaceAll('"','').split(',')[0],expected);checks++;
  }
  await emit({enable_custom_fonts:false});
  await page.setViewportSize({width:width===375?1366:375,height:900});await page.waitForTimeout(80);assert.equal(await style('.hb__heading','fontSize'),width===375?'55px':'25px');checks++;
  assert.deepEqual(errors,[]);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
  await page.close();
 }
 console.log(checks+' Hero Benefits sparse-export, real-font-load, live toggle, full-theme priority, block isolation and redraw checks passed');
}finally{await browser.close();}})().catch(err=>{console.error(err);process.exitCode=1});
