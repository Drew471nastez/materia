const fs=require('fs'),assert=require('assert/strict'),{chromium}=require('playwright'),{render}=require('./theme-text-sections.cjs'),{engine}=require('./theme-featured-product-round5.cjs'),{shapes,styles}=require('../scripts/wavy-shapes.cjs');
const read=f=>fs.readFileSync(f,'utf8');
(async()=>{let checks=0;const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const source=read('sections/wavyrichtextbanner.storelib'),fixture=await render('wavyrichtextbanner');
 // SSR and live updates must use precisely the same geometry, including static previews.
 for(const type of Object.keys(styles)){
  fixture.section.settings.wave_type=type;const e=engine();e.registerFilter('script_tag',()=> '');const ctx={section:fixture.section,settings:{scroll_animation:'none'},request:{design_mode:true}};
  const html=await e.parseAndRender(source.split('<schema>')[0].replace(/^<template compat="shopify">/,'').replace(/<\/template>\s*$/,''),ctx,{globals:ctx});
  for(const shape of shapes[type]){assert(html.includes('d="'+shape.d+'"'));assert(html.includes(shape.values.split(';').join('; ')));checks+=2;}
 }
 for(const width of [375,1366])for(const editing of [true,false]){
  const p=await browser.newPage({viewport:{width,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>r.fulfill({body:''}));await p.goto('http://theme.test/');const {html}=await render('wavyrichtextbanner',editing);await p.setContent(`<style>:root{--color-background:#fff;--color-text:#111;--color-heading:#111;--body-font:Arial;--heading-font:Arial}body{margin:0}</style><div id="shopify-section-test" class="shopify-section">${html}</div>`);await p.addStyleTag({content:read('shopify/assets/text-section-controls.css')});for(const f of ['hero-image-one','text-section-controls'])await p.addScriptTag({content:read('shopify/assets/'+f+'.js')});await p.waitForTimeout(100);
  const root=p.locator('[data-text-controls]'),emit=async settings=>{await p.evaluate(settings=>document.dispatchEvent(new CustomEvent('storelib:settings-change',{detail:{section:'test',settings,live:true}})),settings);await p.waitForTimeout(60);};
  for(const animated of [false,true])for(const time of animated?[0,2.5,5]:[0]){
   const profiles=[];
   for(const type of Object.keys(styles)){
    await emit({wave_type:type,enable_wave_animation:animated,enable_custom_style:true,section_bg:'#335c67',wave_color:'',outer_background:'#ffffff'});
    const result=await root.evaluate((root,{animated,time})=>{
     const paths=[...root.querySelectorAll('.LoudzWavesBox path')];for(const path of paths){path.ownerSVGElement.setCurrentTime(time);path.ownerSVGElement.pauseAnimations();}
     // Sample the animated SVG outline by x, not string identity: two different
     // path strings can still describe virtually identical silhouettes.
     const path=paths[1],outline=document.createElementNS('http://www.w3.org/2000/svg','path'),computed=getComputedStyle(path).d;outline.setAttribute('d',computed.slice(6,-2).split(/\s*[Ll]/)[0]);path.ownerSVGElement.append(outline);const total=outline.getTotalLength(),samples=[];
     for(let x=40;x<1200;x+=40){let low=0,high=total;
      for(let i=0;i<22;i++){const mid=(low+high)/2,p=outline.getPointAtLength(mid);if(p.x<x)low=mid;else high=mid;}samples.push(outline.getPointAtLength((low+high)/2).y);
     }
     outline.remove();return {samples,paused:paths.every(p=>p.ownerSVGElement.animationsPaused()),fill:getComputedStyle(path).fill,overflow:document.documentElement.scrollWidth>innerWidth+1,finite:paths.every(p=>{const b=p.getBBox();return b.width>=1199&&b.width<=1201&&b.y>=0&&b.y+b.height<=201;})};
    },{animated,time});profiles.push({type,values:result.samples});assert(result.finite,type+' fits the complete SVG viewport');assert(!result.overflow);assert.equal(result.fill,'rgb(51, 92, 103)');checks+=3;
    if(!animated&&width===1366&&editing)await root.screenshot({path:'/tmp/wave-'+type+'.png'});
   }
   for(let a=0;a<profiles.length;a++)for(let b=a+1;b<profiles.length;b++){const rms=Math.sqrt(profiles[a].values.reduce((sum,y,i)=>sum+(y-profiles[b].values[i])**2,0)/profiles[a].values.length);assert(rms>15,`${profiles[a].type} and ${profiles[b].type} are visibly distinct (RMS ${rms}) at time ${time}`);checks++;}
  }
  await emit({enable_wave_animation:true});for(const svg of await root.locator('.LoudzWavesBox svg').all()){assert.equal(await svg.evaluate(el=>el.animationsPaused()),false);checks++;}assert.deepEqual(errors,[]);checks++;await p.close();
 }
 console.log(checks+' distinct wave silhouette, static/animated, SSR parity, colour and mobile checks passed');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
