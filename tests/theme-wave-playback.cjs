const fs=require('fs'),assert=require('assert/strict'),{chromium}=require('playwright'),{render}=require('./theme-text-sections.cjs');
const read=f=>fs.readFileSync(f,'utf8');
(async()=>{let checks=0;const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const width of [375,1366])for(const editing of [true,false]){
  const p=await browser.newPage({viewport:{width,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>r.fulfill({body:''}));await p.goto('http://theme.test/');const fixture=await render('wavyrichtextbanner',editing);
  await p.setContent(`<style>:root{--color-background:#fff;--color-text:#111;--color-heading:#111;--body-font:Arial;--heading-font:Arial}body{margin:0}</style><div id="shopify-section-test" class="shopify-section">${fixture.html}</div><div style="height:3000px"></div>`);await p.addStyleTag({content:read('shopify/assets/text-section-controls.css')});for(const f of ['hero-image-one','text-section-controls'])await p.addScriptTag({content:read('shopify/assets/'+f+'.js')});await p.waitForTimeout(120);
  const root=p.locator('[data-text-controls]'),emit=async settings=>{await p.evaluate(settings=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{section:'test',settings,live:true}})),settings);await p.waitForTimeout(45);},sample=()=>root.evaluate(root=>[...root.querySelectorAll('.LoudzWavesBox svg')].map(svg=>({time:svg.getCurrentTime(),paused:svg.animationsPaused(),d:getComputedStyle(svg.querySelector('path')).d})));
  const cdp=await p.context().newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  for(const type of ['type1','type2','type3','type4','type5']){
   await emit({wave_type:type,enable_wave_animation:true});const frames=[await sample()];
   // Native clocks and actual outlines must keep progressing while settings stream in.
   for(let step=0;step<5;step++){await emit({inner_width:80+step,top_padding_mobile:40+step,top_padding_desktop:40+step});await p.waitForTimeout(100);frames.push(await sample());}
   for(let layer=0;layer<4;layer++){for(let step=1;step<frames.length;step++){assert(!frames[step][layer].paused,type+' layer '+layer+' runs automatically');assert(frames[step][layer].time>frames[step-1][layer].time+.04,type+' clock never resets/freezes on edits');checks+=2;}assert(new Set(frames.map(f=>f[layer].d)).size>2,type+' actual geometry keeps moving');checks++;}
  }
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
  await root.evaluate(root=>root.querySelectorAll('.LoudzWavesBox svg').forEach(svg=>svg.setCurrentTime(parseFloat(svg.querySelector('animate').getAttribute('dur'))-.15)));
  const loopBefore=await sample();await p.waitForTimeout(450);const loopAfter=await sample();for(let i=0;i<4;i++){assert(loopAfter[i].time>loopBefore[i].time+.2,'native timeline keeps running across the repeat boundary');assert(!loopAfter[i].paused);checks+=2;}

  // A true builder DOM redraw must keep all four independent SVG phases.
  await root.evaluate(root=>root.querySelectorAll('.LoudzWavesBox svg').forEach((svg,i)=>svg.setCurrentTime(9+i)));
  await emit({content_alignment:'left'});const before=await sample();await root.evaluate(root=>root.replaceWith(root.cloneNode(true)));await p.waitForTimeout(120);const after=await sample();
  for(let i=0;i<4;i++){assert(after[i].time>=before[i].time-.05,'redraw preserves phase, not zero');assert(after[i].time<before[i].time+.8,'redraw does not jump ahead');assert(!after[i].paused);checks+=3;}
  const prior=await sample();await emit({wave_duration:24});const later=await sample();for(let i=0;i<4;i++){assert(Math.abs(later[i].time/2-prior[i].time)<.3,'speed change preserves normalized phase');checks++;}
  await emit({enable_wave_animation:false});let a=await sample();await p.waitForTimeout(150);let b=await sample();assert(b.every((v,i)=>v.paused&&Math.abs(v.time-a[i].time)<.03));await emit({enable_wave_animation:true});a=await sample();await p.waitForTimeout(150);b=await sample();assert(b.every((v,i)=>!v.paused&&v.time>a[i].time+.05));checks+=2;
  await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(90);assert((await sample()).every(v=>v.paused));await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForTimeout(90);assert((await sample()).every(v=>!v.paused));checks+=2;
  // Viewer off-screen work pauses and resumes automatically without restarting.
  // Use a fresh visitor root: settings events deliberately mark the prior one as editing.
  if(!editing){await root.evaluate(root=>{const clone=root.cloneNode(true);clone.dataset.txSection='visitor';clone.dataset.txEditor='false';delete clone.dataset.txEdited;root.replaceWith(clone);});await p.waitForTimeout(100);const atTop=await sample();await p.evaluate(()=>scrollTo(0,2200));await p.waitForTimeout(100);assert((await sample()).every(v=>v.paused));await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(150);assert((await sample()).every((v,i)=>!v.paused&&v.time>=atTop[i].time));checks+=2;}
  assert.deepEqual(errors,[]);checks++;await p.close();
 }
 console.log(checks+' automatic wave playback, throttled CPU, live edits, redraw phase, speed, toggle and reduced-motion checks passed');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
