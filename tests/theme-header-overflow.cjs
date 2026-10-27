const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {engine}=require('./theme-featured-product-round5.cjs');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const source=read('sections/theme-header.storelib'),schema=JSON.parse(source.match(/<schema>([\s\S]*?)<\/schema>/)[1]).shopify;
const defaults=Object.fromEntries(schema.settings.filter(x=>x.id&&'default'in x).map(x=>[x.id,x.default]));
const e=engine(),labels=['Acasă','Sunete','Despre noi','Întrebări frecvente','Returnări','Ghidul cumpărătorului','Contact'];
const links=labels.map((title,index)=>({title,url:'/pages/'+index,links:[],active:false}));
const context={section:{id:'header',settings:{...defaults,header_height:130,logo_position:'center',mega_menu:{links}},blocks:[]},settings:{logo:{src:'https://theme.test/logo.svg',width:100,height:130},logo_width:100,mobile_logo_width:82,body_font:'Arial'},request:{page_type:'index',locale:{iso_code:'ro'}},template:{name:'index'},shop:{name:'Materia'},routes:{root_url:'/',account_login_url:'/account/login',search_url:'/search',cart_url:'/cart'},cart:{item_count:0,items:[]},localization:{country:{iso_code:'RO',name:'România',currency:{iso_code:'EUR',symbol:'€'}},language:{iso_code:'ro',endonym_name:'Română'},available_countries:[],available_languages:[]}};
(async()=>{let checks=0;
 const markup=await e.parseAndRender(source.split('\n<schema>')[0].replace(/^<template compat="shopify">/,'').replace(/<\/template>\s*$/,'').replace(/^[ \t]*comment[ \t]*\n[\s\S]*?^[ \t]*endcomment[ \t]*$/gm,''),context,{globals:context});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const p=await browser.newPage();await p.route('**/*',r=>r.fulfill({body:r.request().url().endsWith('.svg')?'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="130"><rect width="100" height="130" fill="#ddd"/></svg>':'',contentType:r.request().url().endsWith('.svg')?'image/svg+xml':'text/plain'}));
 await p.setContent('<style>:root{--color-background:#fff;--color-heading:#111;--header-logo-width:100px;--header-logo-width-mobile:82px}body{margin:0;font:24px/1.3 Arial}*{box-sizing:border-box}</style><div id="shopify-section-header">'+markup+'</div><main style="height:1800px"></main>');
 await p.addStyleTag({content:read('shopify/assets/critical.css')+read('shopify/assets/theme.css')+read('shopify/assets/navigation.css')});
 // Template styles come after the theme assets on the actual storefront.
 for(const style of await p.locator('#shopify-section-header style').allTextContents())await p.addStyleTag({content:style});
 await p.addScriptTag({content:read('shopify/assets/header-sticky-extras.js')});
 for(const width of [1920,1440,1280,1100,1025])for(const font of [18,24,32]){
  await p.setViewportSize({width,height:900});await p.locator('header.header').evaluate((el,size)=>el.style.setProperty('--menu-font-size',size+'px'),font);
  await p.addStyleTag({content:'.header__menu .horizontal-list > .level0 > menu-item > a{font-size:'+font+'px!important}'});
  await p.evaluate(()=>MateriaHeaderFit.scan(true));await p.waitForTimeout(60);
  const state=await p.evaluate(()=>{const h=document.querySelector('header.header').getBoundingClientRect(),nav=document.querySelector('.navigation.horizontal:not(.mobile)'),items=[...nav.querySelectorAll('.horizontal-list > .level0 > menu-item > a')].map(a=>a.getBoundingClientRect());return {layout:[...document.querySelectorAll('header.header,.header__inner,.header__inner > div,header-inner,.header__menu,.navigation.horizontal:not(.mobile),.navigation.horizontal:not(.mobile) .navigation__menu-content,.navigation.horizontal:not(.mobile) .horizontal-list')].map(el=>({el:el.tagName+'.'+el.className,height:el.getBoundingClientRect().height,css:getComputedStyle(el).height,rows:getComputedStyle(el).gridTemplateRows,min:getComputedStyle(el).minHeight})),height:h.height,bottom:h.bottom,top:h.top,width:innerWidth,page:document.documentElement.scrollWidth,items:items.map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}))};});
  assert(state.height>=130);assert(state.page<=width+1,'no page overflow at '+width+'/'+font);
  assert(state.items.every(r=>r.bottom<=state.bottom+1&&r.top>=state.top-1&&r.left>=-1&&r.right<=width+1),'all translated menu links remain inside header at '+width+'/'+font+' '+JSON.stringify(state));checks++;
 }
 await p.setViewportSize({width:1100,height:900});await p.waitForTimeout(60);assert(await p.locator('header-inner').evaluate(el=>el.hasAttribute('data-header-stacked')));checks++;
 await p.screenshot({path:'/tmp/materia-header-overflow-fixed.png',fullPage:false});
 await p.setViewportSize({width:2400,height:900});await p.addStyleTag({content:'.header__menu .horizontal-list > .level0 > menu-item > a{font-size:14px!important}'});
 await p.evaluate(()=>MateriaHeaderFit.scan(true));await p.waitForFunction(()=>!document.querySelector('header-inner').hasAttribute('data-header-stacked'));checks++;
 await p.locator('.navigation.horizontal:not(.mobile) .horizontal-list > .level0 > menu-item > a').last().evaluate(el=>{window.keptLink=el;el.querySelector('span').textContent='Ghidul cumpărătorului '.repeat(12);});
 await p.waitForFunction(()=>document.querySelector('header-inner').hasAttribute('data-header-stacked'));
 assert(await p.evaluate(()=>window.keptLink===[...document.querySelectorAll('.navigation.horizontal:not(.mobile) .horizontal-list > .level0 > menu-item > a')].at(-1)));checks++;
 await p.setViewportSize({width:1100,height:900});await p.waitForTimeout(60);
 await p.locator('html').evaluate(el=>el.dir='rtl');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks++;
 await p.locator('html').evaluate(el=>el.dir='ltr');await p.setViewportSize({width:390,height:844});assert(await p.locator('[data-action="toggle-nav"]').isVisible());checks++;
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks++;
 console.log(checks+' rendered header containment, translated menus, text sizes, RTL and mobile checks passed');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
