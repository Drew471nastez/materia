const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const code=fs.readFileSync(path.join(__dirname,'../shopify/assets/section-links.js'),'utf8');
(async()=>{let checks=0;const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const editor of [false,true])for(const motion of ['reduce','no-preference']){
  const p=await browser.newPage({viewport:{width:390,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.fulfill({body:'<html><body></body></html>',contentType:'text/html'}));await p.goto('https://theme.test/page?preview=one');
  await p.setContent('<style>body{margin:0;padding-top:120px}header{position:fixed;top:32px;height:80px;inset-inline:0;background:white}aside{position:fixed;top:0;height:32px}section{height:500px;margin-top:800px}footer{height:1000px}</style><aside data-sticky-announcement>Announcement</aside><header class="header">Header</header><a href="#demo" '+(editor?'target="_blank"':'')+'>Go to section</a><section id="shopify-section-demo">Destination</section><footer></footer>');
  await p.evaluate(editor=>{window.Shopify={designMode:editor};window.closes=[];window.MateriaMenu={close:x=>closes.push(x)};window.positions=[];addEventListener('scroll',()=>positions.push(scrollY));},editor);await p.emulateMedia({reducedMotion:motion});await p.addScriptTag({content:code});
  await p.locator('a').click();await p.waitForFunction(()=>Math.abs(document.querySelector('section').getBoundingClientRect().top-128)<2);
  assert.equal(await p.evaluate(()=>location.hash),'#demo');assert.deepEqual(await p.evaluate(()=>closes),[true]);checks++;
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
 await p.close();console.log(checks+' live/editor section-link, header-offset, reduced-motion, nested-scroll and external-link checks passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
