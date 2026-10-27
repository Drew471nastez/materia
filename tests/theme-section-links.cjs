const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const code=fs.readFileSync(path.join(__dirname,'../shopify/assets/section-links.js'),'utf8');
(async()=>{let checks=0;const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const editor of [false,true])for(const motion of ['reduce','no-preference']){
  const p=await browser.newPage({viewport:{width:390,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.fulfill({body:'<html><body></body></html>',contentType:'text/html'}));await p.goto('https://theme.test/page?preview=one');
  await p.setContent('<style>body{margin:0;padding-top:120px}header{position:fixed;top:32px;height:80px;inset-inline:0;background:white}aside{position:fixed;top:0;height:32px}section{height:500px;margin-top:800px}footer{height:1000px}</style><aside data-sticky-announcement>Announcement</aside><header class="header">Header</header><a href="#demo" '+(editor?'target="_blank"':'')+'>Go to section</a><section id="shopify-section-demo">Destination</section><footer></footer>');
  await p.evaluate(editor=>{window.Shopify={designMode:editor};window.closes=[];window.MateriaMenu={close:x=>closes.push(x)};window.positions=[];addEventListener('scroll',()=>positions.push(scrollY));},editor);await p.emulateMedia({reducedMotion:motion});await p.addScriptTag({content:code});
  await p.locator('a').click();await p.waitForFunction(()=>Math.abs(document.querySelector('section').getBoundingClientRect().top-128)<2);
  assert.equal(await p.evaluate(()=>location.hash),editor?'':'#demo');assert.deepEqual(await p.evaluate(()=>closes),[true]);checks++;
  if(motion==='no-preference'){const values=await p.evaluate(()=>positions);assert(values.some((n,i)=>i&&n>values[0]&&n<values.at(-1)),'scroll uses intermediate frames');checks++;}
  assert.equal(await p.evaluate(()=>document.activeElement.id),'shopify-section-demo');checks++;
  assert(await p.evaluate(()=>!MateriaSectionLinks.resolve(Object.assign(document.createElement('a'),{href:'https://other.test/#demo'}))));assert(await p.evaluate(()=>!MateriaSectionLinks.resolve(Object.assign(document.createElement('a'),{href:'#missing'}))));checks++;
  assert.deepEqual(errors,[]);await p.close();
 }
 const p=await browser.newPage({viewport:{width:900,height:700}});await p.route('**/*',r=>r.fulfill({body:'<html></html>',contentType:'text/html'}));await p.goto('https://theme.test/');
 await p.setContent('<a href="#section:inner">Inside</a><div id="scroller" style="height:220px;overflow:auto"><div style="height:600px"></div><section data-storelib-section-id="inner" style="height:300px">Target</section><div style="height:600px"></div></div>');
 await p.addScriptTag({content:code});await p.locator('a').click();await p.waitForFunction(()=>Math.abs(document.querySelector('#scroller').scrollTop-584)<2);checks++;
 await p.locator('body').evaluate(el=>el.innerHTML='<a id="wrapped-link" href="#wrapped">Wrapped</a><div style="height:600px"></div><div id="shopify-section-wrapped" style="display:contents"><style></style><section id="real-section" style="height:300px">Content</section></div><div style="height:900px"></div>');
 assert.equal(await p.evaluate(()=>MateriaSectionLinks.resolve(document.querySelector('#wrapped-link')).target.id),'real-section','display-contents canvas wrappers use the real section rectangle');checks++;
 await p.close();
 // Reproduce the actual exported picker link against a different canvas URL,
 // a canonical storefront URL, and an imported template-prefixed wrapper.
 const canvas=await browser.newPage({viewport:{width:900,height:700}});
 await canvas.route('**/*',r=>r.fulfill({body:'<html></html>',contentType:'text/html'}));await canvas.goto('https://editor.test/canvas/site?preview=one');
 await canvas.setContent('<link rel="canonical" href="https://storefront.test/"><style>body{margin:0;height:3200px}#visual{height:400px}</style><a id="jump" href="/#section-benefits_bar_b3YbxP" target="_blank">Go</a><div style="height:900px"></div><div id="shopify-section-template--123__benefits_bar_b3YbxP" style="display:contents"><style></style><div style="display:contents"><section id="visual">Benefits</section></div></div>');
 await canvas.evaluate(()=>{window.selections=0;document.addEventListener('pointerdown',()=>selections++);window.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();},true);});
 await canvas.addScriptTag({content:code});
 await canvas.evaluate(()=>document.documentElement.classList.add('shopify-design-mode'));
 assert.equal(await canvas.evaluate(()=>MateriaSectionLinks.resolve(document.querySelector('#jump')).target.id),'visual');checks++;
 await canvas.locator('#jump').click();await canvas.waitForFunction(()=>Math.abs(document.querySelector('#visual').getBoundingClientRect().top-16)<2);
 assert.equal(await canvas.evaluate(()=>location.href),'https://editor.test/canvas/site?preview=one');assert.equal(await canvas.evaluate(()=>selections),0);checks++;
 for(const href of ['https://other.test/#section-benefits_bar_b3YbxP','/other-page#section-benefits_bar_b3YbxP']){assert(await canvas.evaluate(href=>{const a=document.createElement('a');a.href=href;return !MateriaSectionLinks.resolve(a);},href));checks++;}
 await canvas.close();
 // In the full layout the early bridge wins before the editor's own click
 // capture, while the complete resolver is still loaded with defer.
 const bridged=await browser.newPage({viewport:{width:900,height:700}});
 await bridged.setContent('<html class="shopify-design-mode"><style>body{margin:0;height:3000px}</style><a href="#section-destination">Go</a><div style="height:900px"></div><section id="shopify-section-destination" style="height:300px">Destination</section></html>');
 const early=fs.readFileSync(path.join(__dirname,'../snippets/section-link-capture.storelib'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
 await bridged.addScriptTag({content:early});await bridged.evaluate(()=>{window.intercepts=0;addEventListener('click',event=>{intercepts++;event.preventDefault();event.stopImmediatePropagation();},true);});
 await bridged.addScriptTag({content:code});await bridged.locator('a').click();
 await bridged.waitForFunction(()=>Math.abs(document.querySelector('section').getBoundingClientRect().top-16)<2);assert.equal(await bridged.evaluate(()=>intercepts),0);checks++;
 await bridged.close();
 // Full-height, zoomed iframe: only the parent canvas viewport can scroll.
 const parent=await browser.newPage({viewport:{width:900,height:700}});
 await parent.setContent('<style>body{margin:0}#viewport{height:400px;overflow:auto}iframe{width:800px;height:2600px;border:0;transform:scale(.8);transform-origin:top left}</style><div id="viewport"><iframe></iframe></div>');
 const frame=parent.frames()[1];await frame.setContent('<style>body{margin:0}section{height:300px}</style><a href="#section-inner">Go</a><div style="height:1000px"></div><section id="shopify-section-inner">Inner</section><div style="height:1000px"></div>');
 await frame.addScriptTag({content:code});await frame.evaluate(()=>{document.querySelector('a').click();});
 await parent.waitForFunction(()=>{const f=document.querySelector('iframe'),box=f.getBoundingClientRect(),target=f.contentDocument.querySelector('section').getBoundingClientRect();return Math.abs(box.top+target.top*(box.width/f.offsetWidth)-16)<2;});
 const position=await frame.locator('section').boundingBox();assert(Math.abs(position.y-16)<3,'scaled parent canvas scrolls the section into view');checks++;
 await parent.close();
 console.log(checks+' live/editor section-link, header-offset, canonical URL, captured-click, iframe and external-link checks passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
