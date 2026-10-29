// Reproduce the screenshot with critical.css, rounded article quotes, actual
// saved section data and every saved color scheme (custom overrides off). No private editor access.
const fs=require('fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {engine}=require('./theme-featured-product-round5.cjs');
const read=f=>fs.readFileSync(f,'utf8'),clean=s=>s.split('<schema>')[0].replace(/^<template compat="shopify">/,'').replace(/<\/template>\s*$/,'');
const schema=JSON.parse(read('sections/testimonial2.storelib').split('<schema>')[1].split('</schema>')[0]).shopify;
const theme=JSON.parse(read('config/settings.json')).shopify,saved=Object.entries(JSON.parse(read('templates/home.json')).sections).find(([,s])=>s.type==='testimonial2');
const defaults=b=>Object.fromEntries(b.settings.filter(s=>s.id&&'default'in s).map(s=>[s.id,s.default]));
const luminance=rgb=>{const c=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{if(!rgb.startsWith('color('))v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
(async()=>{let checks=0;const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const width of [375,1366])for(const [key,scheme]of Object.entries(theme.color_schemes)){
  const s=scheme.settings,p=await browser.newPage({viewport:{width,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>r.fulfill({body:'',contentType:'text/html'}));await p.goto('https://theme.test/');
  const section={id:saved[0],settings:{...defaults(schema),...saved[1].settings,enable_custom_style:false,color_scheme:key},blocks:saved[1].block_order.map(id=>{const b=saved[1].blocks[id];return{id,...b,settings:{...defaults(schema.blocks.find(x=>x.type===b.type)),...b.settings,enable_custom_style:false}};})};
  const ctx={section,settings:theme,request:{design_mode:true}},e=engine(),html=await e.parseAndRender(clean(read('sections/testimonial2.storelib')),ctx,{globals:ctx}),controls=await e.parseAndRender(clean(read('snippets/theme-controls.storelib')),ctx,{globals:ctx});
  const variables=`:root,.color-${key}{--color-background:${s.background};--color-text:${s.text_color};--color-heading:${s.heading_color};--color-border:${s.border_color};--btn-primary-bg-color:${s.btn_primary_background};--btn-primary-color:${s.btn_primary_color};--btn-primary-border-color:${s.btn_primary_border_color};--body-font:Arial;--heading-font:Arial;--body-font-size:${theme.body_font_size}px;--body-weight:${theme.body_font_weight};--heading-weight:${theme.heading_font_weight};--h2-size:32px;--body-line-height:${theme.body_line_height};--heading-line-height:1.2;--heading-letter-spacing:normal;--rounded-radius:${theme.rounded_corner}px;--grey-color:#f5f5f5}body{margin:0}`;
  await p.setContent('<html><head><style>'+read('shopify/assets/critical.css')+read('shopify/assets/theme.css')+variables+'</style>'+controls+'</head><body class="rounded-style"><div class="shopify-section" id="shopify-section-'+section.id+'">'+html+'</div><blockquote id="article-quote">Article quote</blockquote></body></html>');await p.addStyleTag({content:read('shopify/assets/theme-button-contract.css')+read('shopify/assets/testimonial-quote.css')});
  // The reset must work before JS too, not briefly flash the article panel.
  assert.equal(await p.locator('.tq-quote').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');checks++;
  await p.addScriptTag({content:read('shopify/assets/testimonial-quote.js')});await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const actual=await p.locator('.tq-card').first().evaluate(el=>{const q=el.querySelector('.tq-quote'),t=el.querySelector('.tq-quote-text'),style=getComputedStyle(q);return{background:getComputedStyle(el).backgroundColor,text:getComputedStyle(t).color,padding:style.padding,radius:style.borderRadius,height:q.clientHeight,card:el.clientHeight,fontsize:getComputedStyle(t).fontSize,weight:getComputedStyle(t).fontWeight};});
  assert.equal(actual.padding,'0px');assert.equal(actual.radius,'0px');assert.equal(actual.fontsize,theme.body_font_size+'px');assert.equal(actual.weight,String(theme.body_font_weight));assert(actual.height<actual.card-60);checks++;
  const a=luminance(actual.background),b=luminance(actual.text);assert((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,key+' quote contrast: '+JSON.stringify(actual));checks++;
  assert.equal(await p.locator('#article-quote').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(245, 245, 245)');assert.equal(await p.locator('#article-quote').evaluate(el=>getComputedStyle(el).borderRadius),'20px');checks++;
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);checks++;
  if(key==='scheme-4faf0e4d-27f4-4d02-bc51-617383bab1a9')await p.screenshot({path:'/tmp/testimonial-quote-fixed-saved-dark-'+width+'.png'});await p.close();
 }
 console.log(checks+' saved-theme quote contrast, scoped article reset, typography, compact sizing and responsive checks passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
