const fs=require('fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const source=fs.readFileSync('snippets/header-sticky-controller.storelib','utf8');
const strip=s=>s.replace(/\{%[\s\S]*?%\}/g,'').replace(/\{\{\s*section.id\s*\}\}/g,'header');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<style>body{margin:0}.shopify-section{position:relative}#sticky{position:sticky;top:var(--storelib-announcement-top,0px);z-index:12}header.header{height:80px;background:white}main{height:3000px}</style><div class="shopify-section"><section data-sticky-announcement="false" style="height:60px;background:red">Basic</section></div><div class="shopify-section"><section data-sticky-announcement="false" style="height:40px;background:blue">Pro</section></div><div id="sticky" class="shopify-section"><div data-sticky-announcement="true" style="height:30px;background:green">Sticky</div></div><div id="shopify-section-header" class="shopify-section section-header"><header class="header" data-sticky="always" data-sticky-mobile="true">Header</header></div><main></main>');
 await page.addStyleTag({content:strip(source.match(/<style>([\s\S]*?)<\/style>/)[1])});
 await page.addScriptTag({content:strip(source.match(/<script>([\s\S]*?)<\/script>/)[1])});
 const offset=()=>page.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--storelib-header-top')));
 await page.waitForFunction(()=>window.StorelibStickyStack?.top===30);assert.equal(await offset(),30);
 await page.evaluate(()=>scrollTo(0,50));await page.waitForTimeout(50);assert.equal(await offset(),30);
 await page.evaluate(()=>scrollTo(0,180));await page.waitForTimeout(50);assert.equal(await offset(),30);
 await page.evaluate(()=>document.querySelector('[data-sticky-announcement=true]').style.height='50px');await page.waitForFunction(()=>window.StorelibStickyStack?.top===50);
 assert.equal(await page.locator('#shopify-section-header').evaluate(el=>getComputedStyle(el).transitionDuration.split(',')[0]),'0.45s');
 await page.evaluate(()=>{document.querySelector('[data-sticky-announcement=true]').hidden=true;document.dispatchEvent(new CustomEvent('storelib:section-load'));});await page.waitForFunction(()=>window.StorelibStickyStack?.top===0);
 assert.deepEqual(errors,[]);console.log('7 mixed announcement stack, resize, dismissal and unchanged sticky-animation checks passed');
}finally{await browser.close();}})().catch(err=>{console.error(err);process.exitCode=1;});
