/* Header containment on the design restored in 7fd60ba ("Restore the header and
   announcement bars from 25 October", made with the creator). That commit took
   out MateriaHeaderFit, the script that stacked a long menu onto a second row;
   it stays out. What the header must still do: keep its layout and saved height
   at common widths with the saved header and saved main menu, keep every link
   of that menu inside the bar, and never scroll the page sideways, even with
   long translated labels at large text sizes or right to left. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {engine}=require('./theme-featured-product-round5.cjs');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const source=read('sections/theme-header.storelib'),schema=JSON.parse(source.match(/<schema>([\s\S]*?)<\/schema>/)[1]).shopify;
const defaults=Object.fromEntries(schema.settings.filter(x=>x.id&&'default'in x).map(x=>[x.id,x.default]));
const group=JSON.parse(read('sections/header-group.json')),savedHeader=Object.values(group.sections).find(s=>s.type==='theme-header').settings;
const menus=JSON.parse(read('config/settings.json')).menus,toLinks=list=>list.map((l,i)=>({title:l.title,url:l.url||'/pages/'+i,links:[],active:false}));
const savedMenu=toLinks(menus[savedHeader.mega_menu||'main-menu'].links);
const translated=toLinks(['Acasă','Sunete','Despre noi','Întrebări frecvente','Returnări','Ghidul cumpărătorului','Contact'].map(title=>({title})));
const render=async links=>{const e=engine(),context={section:{id:'header',settings:{...defaults,...savedHeader,mega_menu:{links}},blocks:[]},settings:{logo:{src:'https://theme.test/logo.svg',width:100,height:130},logo_width:100,mobile_logo_width:82,body_font:'Arial'},request:{page_type:'index',locale:{iso_code:'ro'}},template:{name:'index'},shop:{name:'Materia'},routes:{root_url:'/',account_login_url:'/account/login',search_url:'/search',cart_url:'/cart'},cart:{item_count:0,items:[]},localization:{country:{iso_code:'RO',name:'România',currency:{iso_code:'EUR',symbol:'€'}},language:{iso_code:'ro',endonym_name:'Română'},available_countries:[],available_languages:[]}};
 return e.parseAndRender(source.split('\n<schema>')[0].replace(/^<template compat="shopify">/,'').replace(/<\/template>\s*$/,'').replace(/^[ \t]*comment[ \t]*\n[\s\S]*?^[ \t]*endcomment[ \t]*$/gm,''),context,{globals:context});};
(async()=>{let checks=0;
 assert(!/MateriaHeaderFit|data-header-stacked/.test(read('shopify/assets/header-sticky-extras.js')+source),'the restored header has no menu-fitting script');checks++;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const [name,links] of [['saved',savedMenu],['translated',translated]]){
  const markup=await render(links),p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>{const u=new URL(r.request().url()),n=u.pathname.split('/').pop();if(n.endsWith('.svg'))return r.fulfill({body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="130"><rect width="100" height="130" fill="#ddd"/></svg>',contentType:'image/svg+xml'});if(/^[\w.-]+\.css$/.test(n)&&fs.existsSync('shopify/assets/'+n))return r.fulfill({body:read('shopify/assets/'+n),contentType:'text/css'});return r.fulfill({body:'',contentType:n.endsWith('.js')?'application/javascript':'text/plain'});});
  await p.goto('https://theme.test/');
  await p.setContent('<html><head><base href="https://theme.test/"><style>:root{--color-background:#fff;--color-heading:#111;--header-logo-width:100px;--header-logo-width-mobile:82px}body{margin:0;font:16px/1.3 Arial}*{box-sizing:border-box}'+read('shopify/assets/critical.css')+read('shopify/assets/theme.css')+read('shopify/assets/navigation.css')+'</style></head><body><div id="shopify-section-header" class="shopify-section section-header">'+markup+'</div><main style="height:1800px"></main></body></html>',{waitUntil:'load'});
  await p.addScriptTag({content:read('shopify/assets/header-sticky-extras.js')});
  const fonts=name==='saved'?[16]:[18,24,32];
  for(const width of [1920,1440,1366,1280,1100,1025])for(const font of fonts){
   await p.setViewportSize({width,height:900});await p.addStyleTag({content:'.header__menu .horizontal-list > .level0 > menu-item > a{font-size:'+font+'px!important}'});await p.waitForTimeout(40);
   const state=await p.evaluate(()=>{const h=document.querySelector('header.header').getBoundingClientRect(),nav=document.querySelector('.navigation.horizontal:not(.mobile)'),logo=document.querySelector('.header__logo').getBoundingClientRect();return {height:h.height,top:h.top,bottom:h.bottom,logo:{w:logo.width,h:logo.height},nav:!!nav&&getComputedStyle(nav).display!=='none',page:document.documentElement.scrollWidth,items:[...nav.querySelectorAll('.horizontal-list > .level0 > menu-item > a')].map(a=>{const r=a.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})};});
   assert(state.height>=savedHeader.header_height-1,name+' header keeps its saved height at '+width+': '+state.height);
   assert(state.nav&&state.logo.w>0&&state.logo.h>0,name+' header keeps logo and menu at '+width);
   assert(state.page<=width+1,name+' menu scrolls the page sideways at '+width+'/'+font+': '+state.page);
   if(name==='saved')assert(state.items.length===links.length&&state.items.every(r=>r.bottom<=state.bottom+1&&r.top>=state.top-1&&r.left>=-1&&r.right<=width+1),'saved menu links stay inside the header at '+width+' '+JSON.stringify(state));
   checks++;
  }
  await p.setViewportSize({width:1100,height:900});await p.locator('html').evaluate(el=>el.dir='rtl');await p.waitForTimeout(40);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' RTL');checks++;
  await p.locator('html').evaluate(el=>el.dir='ltr');
  for(const width of [768,390,375]){await p.setViewportSize({width,height:844});await p.waitForTimeout(40);assert(await p.locator('[data-action="toggle-nav"]').first().isVisible(),name+' menu button at '+width);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' no sideways scroll at '+width);checks++;}
  if(name==='saved')await p.setViewportSize({width:1366,height:900}),await p.screenshot({path:'/tmp/materia-header-restored-1366.png'});
  assert.deepEqual(errors,[]);checks++;await p.close();
 }
 console.log(checks+' restored header layout, saved menu containment, translated text sizes, RTL and phone checks passed');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
