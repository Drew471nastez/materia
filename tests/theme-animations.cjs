/* Theme settings > Animations with the real animation.css / animation.js /
   theme.css: every "When a section scrolls into view" type animates a
   below-the-fold element once, leaves the first screen alone, follows the
   duration and delay settings, staggers cards that arrive together, stays off
   under reduced motion and in the builder. Image hover effects run for a fine
   pointer and never on touch. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const schema=JSON.parse(read('shopify/config/settings_schema.json'));
const setting=id=>schema.flatMap(g=>g.settings||[]).find(s=>s.id===id);
const types=setting('scroll_animation').options.map(o=>o.value).filter(v=>v!=='none');
const animationCss=read('shopify/assets/animation.css'),animationJs=read('shopify/assets/animation.js');
// What each type may animate: compositor properties, plus a small blur or a clip.
const allowed={blur_up:['opacity','transform','filter'],mask_reveal:['opacity','transform','clipPath']};
const fixture=(type,{dir='ltr',html=''}={})=>`<!doctype html><html dir="${dir}" class="${html}"><head><style>
 :root{--animation-duration:400ms;--animation-delay-base:120ms}
 body{margin:0;font:16px Arial} .shopify-section{min-height:300px;padding:20px;background:#f4f1ec} .card{display:inline-block;width:30%;height:120px;background:#ddd}
 .spacer{height:1600px}
</style><style>${animationCss}</style></head><body>
 <div class="shopify-section scroll-trigger ${type}" id="first"><h1>Linen shirts</h1></div>
 <div class="spacer"></div>
 <div class="shopify-section scroll-trigger ${type}" id="below"><h2>Care guide</h2></div>
 <div class="spacer"></div>
 <div class="shopify-section scroll-trigger ${type}" id="wrapper"><div class="card scroll-trigger ${type}" id="c1"></div><div class="card scroll-trigger ${type}" id="c2"></div><div class="card scroll-trigger ${type}" id="c3"></div></div>
 <div class="spacer"></div>
</body></html>`;
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
 try {
  // Every option is drawn by animation.css and wired through the same class.
  for(const t of types)assert(animationCss.includes(`.scroll-trigger.${t}`)&&animationCss.includes(`.${t}`),t+' has its reveal');
  assert(read('layout/theme.storelib').includes("s.classList.add('scroll-trigger', 'ti-section-reveal', anim)"));
  assert.equal((animationJs.match(/new IntersectionObserver/g)||[]).length,2,'one reveal observer, one zoom observer');checks++;

  const context=await browser.newContext({viewport:{width:1280,height:800}});
  // Each fixture gets a fresh page: a new document, scroll at the top, the script run once.
  let page=null;const errors=[];
  const load=async(html,media)=>{if(page)await page.close();page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));if(media)await page.emulateMedia(media);await page.setContent(html);await page.addScriptTag({content:animationJs});};
  const state=sel=>page.$eval(sel,el=>{const c=getComputedStyle(el);return {opacity:+c.opacity,name:c.animationName,duration:c.animationDuration,delay:c.animationDelay,armed:el.classList.contains('scroll-trigger--armed'),off:el.classList.contains('scroll-trigger--offscreen'),done:el.hasAttribute('data-animation-done'),anims:el.getAnimations().length}});
  for(const type of types){
   await load(fixture(type));
   await page.waitForTimeout(50);
   let s=await state("#first");
   assert(s.done&&!s.armed&&s.opacity===1&&s.anims===0,`${type}: first screen shows at once`);
   s=await state('#below');assert(s.armed&&s.off&&s.opacity===0,`${type}: below the fold waits`);
   s=await state('#wrapper');assert(s.done&&!s.armed&&s.opacity===1,`${type}: a wrapper of cards does not animate too`);
   s=await state('#c1');assert(s.armed&&s.off,`${type}: cards wait`);
   // Scroll the section in: it animates with the duration and delay settings.
   await page.$eval('#below',el=>el.scrollIntoView({block:'center'}));
   await page.waitForTimeout(60);
   s=await state('#below');
   assert(!s.off&&s.anims===1&&s.name!=='none',`${type}: reveal plays (${s.name})`);
   assert.equal(s.duration,type==='cinematic'?'0.5s':'0.4s',`${type}: Animation duration`);
   assert.equal(s.delay,'0.12s',`${type}: Animation delay before start`);
   const props=await page.$eval('#below',el=>[...new Set(el.getAnimations()[0].effect.getKeyframes().flatMap(k=>Object.keys(k).filter(p=>!['offset','easing','composite','computedOffset'].includes(p))))]);
   for(const p of props)assert((allowed[type]||['opacity','transform']).includes(p),`${type}: animates only cheap properties, not ${p}`);
   // Halfway it is on its way in, then it finishes and holds nothing.
   const mid=await page.$eval('#below',el=>{const a=el.getAnimations()[0];a.pause();a.currentTime=120+60;const c=getComputedStyle(el);const out={o:+c.opacity,t:c.transform,clip:c.clipPath};a.play();return out;});
   assert(mid.o<1||mid.t!=='none'||mid.clip!=='none',`${type}: visibly in motion halfway`);
   await page.waitForTimeout(600);
   s=await state('#below');assert(s.done&&!s.armed&&s.opacity===1&&s.anims===0,`${type}: finishes in its final state`);
   // Cards arriving together play a short stagger apart.
   await page.$eval('#wrapper',el=>el.scrollIntoView({block:'center'}));await page.waitForTimeout(60);
   const delays=await Promise.all(['#c1','#c2','#c3'].map(async id=>(await state(id)).delay));
   assert.deepEqual(delays,['0.12s','0.19s','0.26s'],`${type}: stagger`);
   await page.waitForTimeout(1200);
   // Once only: scrolling away and back does not replay.
   await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(80);
   await page.$eval('#below',el=>el.scrollIntoView({block:'center'}));await page.waitForTimeout(80);
   for(const id of ['#below','#c1','#c2','#c3']){s=await state(id);assert(s.done&&s.anims===0&&s.opacity===1,`${type}: ${id} plays once`);}
   checks++;
  }

  // Slide from side starts from the inline start: the left, or the right in RTL.
  for(const [dir,sign] of [['ltr',-1],['rtl',1]]){
   await load(fixture('slide_side',{dir}));
   await page.$eval('#below',el=>el.scrollIntoView({block:'center'}));await page.waitForTimeout(30);
   const x=await page.$eval('#below',el=>{const a=el.getAnimations()[0];a.pause();a.currentTime=0;return new DOMMatrix(getComputedStyle(el).transform).m41;});
   assert.equal(Math.sign(x),sign,`slide_side ${dir}`);
  }
  checks++;

  // The builder (design mode, or a section drawn again in place) shows everything at once.
  await load(fixture('subtle_rise',{html:'shopify-design-mode'}));
  for(const id of ['#first','#below','#c1']){const s=await state(id);assert(s.done&&!s.armed&&s.opacity===1,'design mode '+id);}
  await load(fixture('blur_up'));
  await page.evaluate(()=>{const s=document.createElement('div');s.className='shopify-section scroll-trigger blur_up';s.id='redrawn';s.style.marginTop='2000px';document.body.append(s);s.dispatchEvent(new CustomEvent('storelib:section-load',{bubbles:true,detail:{sectionId:'redrawn'}}));});
  {const s=await state('#redrawn');assert(s.done&&s.opacity===1,'builder redraw shows at once');}
  checks++;

  // Reduced motion: nothing is hidden or animated.
  await load(fixture('cinematic'),{reducedMotion:'reduce'});
  for(const id of ['#below','#c2']){const s=await state(id);assert(!s.armed&&s.opacity===1&&s.anims===0,'reduced motion '+id);}
  checks++;
  assert.deepEqual(errors,[]);
  await context.close();

  // Image hover effects: on product and image cards for a mouse, never on touch.
  const effects=setting('hover_effect').options.map(o=>o.value).filter(v=>v!=='none');
  const card=fx=>`<div class="product-item__wrapper product-grid ${fx}"><div class="product-item__inner hover-effect overflow-hidden relative"><img class="first-image" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width="200" height="200" style="display:block;width:200px;height:200px"><img class="secondary-image" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width="200" height="200" style="position:absolute;inset:0;width:200px;height:200px"></div></div><div class="collection-item ${fx}"><div class="block collection-item__media--ratio hover-effect"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width="200" height="200" style="display:block;width:200px;height:200px"></div></div>`;
  const theme=read('shopify/assets/theme.css');
  const look=(p,sel)=>p.$eval(sel,el=>{const m=el.querySelector('.hover-effect'),i=m.querySelector('img'),s=m.querySelector('.secondary-image');const a=getComputedStyle(m),b=getComputedStyle(i);return [a.transform,a.boxShadow,b.transform,b.opacity,b.filter,s?getComputedStyle(s).opacity:'-'].join('|')});
  for(const [label,opts,expectChange] of [['mouse',{viewport:{width:1280,height:800}},true],['touch',{viewport:{width:1280,height:800},hasTouch:true,isMobile:true},false]]){
   const ctx=await browser.newContext(opts);const p=await ctx.newPage();
   for(const fx of effects){
    await p.setContent(`<style>:root{--transition:0s;--zoom-transform:scale(1.05)}*{transition-duration:0s!important}</style><style>${theme}</style>${card(fx)}`);
    for(const sel of ['.product-item__wrapper','.collection-item']){
     await p.mouse.move(1200,780);const rest=await look(p,sel);
     const box=await p.locator(`${sel} .hover-effect`).boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);
     const hover=await look(p,sel);
     if(expectChange)assert.notEqual(hover,rest,`${fx} on ${sel} answers a mouse`);else assert.equal(hover,rest,`${fx} on ${sel} stays still on touch`);
    }
   }
   await ctx.close();checks++;
  }

  // Button hover effects: an outline button draws all four borders, at rest
  // and hovered, for every hover effect, on 1x, 2x and 3x screens and at
  // fractional positions (a permanent will-change once let the compositor
  // stretch a 1px border away on the left and top).
  {
   const ctl=read('snippets/theme-controls.storelib').match(/<style>([\s\S]*?)<\/style>/)[1].replace(/\{%\s*if request\.design_mode\s*%\}[\s\S]*?\{%\s*endif\s*%\}/,'').replace(/\{\{\s*button_radius\s*\}\}/g,'8').replace(/\{\{[^}]*default:\s*'?([^}' ]+)'?\s*\}\}/g,'$1').replace(/\{%-?[\s\S]*?-?%\}/g,'');
   const vars=':root{--btn-anim-duration:0ms;--btn-border-width:1px;--body-font:Arial;--heading-font:Arial;--color-background:#fff;--color-text:#222;--color-heading:#222;--btn-primary-bg-color:#d00000;--btn-primary-color:#fff;--btn-primary-border-color:#d00000;--btn-primary-hover-bg-color:#0000d0;--btn-primary-hover-color:#fff;--btn-primary-hover-border-color:#00a000;--btn-secondary-bg-color:transparent;--btn-secondary-color:#d00000;--btn-secondary-border-color:#d00000;--btn-secondary-hover-bg-color:#0000d0;--btn-secondary-hover-color:#fff;--btn-secondary-hover-border-color:#00a000;--btn-outline-color:#d00000;--btn-outline-border-color:#d00000}body{margin:0;background:#fff;font-family:Arial}.cell{display:inline-block;margin:13.37px 9.61px}';
   const kinds=fx=>[
    `<button class="cookie-consent__btn btn-outline" data-theme-button="secondary" data-sl-button data-button-appearance="outline" data-button-hover="${fx}">Decline</button>`,
    `<a class="btn btn-primary" data-theme-button="primary" data-button-appearance="outline" data-button-hover="${fx}">Shop now</a>`,
    '<div class="shopify-section"><a class="btn btn-outline">View all</a></div>',
    '<div class="shopify-section"><a class="btn btn-secondary">More</a></div>',
    '<div class="shopify-section"><a data-sl-button class="btn-outline">Read</a></div>'];
   const effects=setting('btn_hover_effect').options.map(o=>o.value);
   const decoder=await browser.newPage();
   const sheets=['critical.css','theme.css','theme-button-contract.css','cookie-consent.css'].map(f=>read('shopify/assets/'+f)).concat(ctl);
   const missing=[];
   for(const dpr of [1,2,3]){
    const p=await browser.newPage({viewport:{width:900,height:900},deviceScaleFactor:dpr});
    for(const fx of effects){
     let html=`<style>${vars}</style><body data-btn-style="outline" data-btn-secondary-style="outline" data-btn-hover="${fx}" data-sl-btn-hover="theme">`;
     kinds(fx).forEach((m,i)=>{for(const j of [0,1])html+=`<span class="cell" id="k${i}-${j}" style="margin-left:${9.61+j*0.37}px">${m}</span>`;html+='<br>';});
     await p.setContent(html);for(const c of sheets)await p.addStyleTag({content:c});
     for(const id of await p.$$eval('.cell',c=>c.map(e=>e.id))){
      const sel=`#${id} :is(a,button)`;
      for(const st of ['rest','hover']){
       if(st==='hover')await p.hover(sel);else await p.mouse.move(890,890);
       await p.waitForTimeout(20);
       const r=await p.$eval(sel,e=>{const x=e.getBoundingClientRect();return {x:x.x,y:x.y,w:x.width,h:x.height,bc:getComputedStyle(e).borderLeftColor}});
       const clip={x:Math.floor(r.x)-4,y:Math.floor(r.y)-4,width:Math.ceil(r.w)+9,height:Math.ceil(r.h)+9};
       const b64=(await p.screenshot({clip})).toString('base64');
       const d=await decoder.evaluate(async({b64,r,clip,dpr})=>{
        const img=new Image();img.src='data:image/png;base64,'+b64;await img.decode();
        const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.drawImage(img,0,0);
        const m=r.bc.match(/\d+/g).map(Number);
        const near=(x,y)=>{const q=g.getImageData(Math.round(x*dpr),Math.round(y*dpr),1,1).data;return Math.hypot(q[0]-m[0],q[1]-m[1],q[2]-m[2]);};
        const lx=r.x-clip.x,ty=r.y-clip.y,cx=lx+r.w/2,cy=ty+r.h/2;
        const best=f=>{let b=999;for(let t=-1.5;t<=1.5;t+=0.5/dpr)b=Math.min(b,f(t));return b;};
        return {L:best(t=>near(lx+.5+t,cy)),R:best(t=>near(lx+r.w-.5+t,cy)),T:best(t=>near(cx,ty+.5+t)),B:best(t=>near(cx,ty+r.h-.5+t))};
       },{b64,r,clip,dpr});
       const gone=Object.keys(d).filter(k=>d[k]>90);
       if(gone.length)missing.push(`${dpr}x ${fx} ${id} ${st}: ${gone.join('')}`);
      }
     }
    }
    await p.close();
   }
   await decoder.close();
   assert.deepEqual(missing,[],'every outline border is drawn');checks++;

   // Slide: once the sweep has covered the button, its own fill is the hover
   // colour too, so no rest colour is left at the rounded corners.
   const p=await browser.newPage();
   await p.setContent(`<style>${vars}</style><body data-btn-style="solid" data-btn-secondary-style="solid" data-btn-hover="slide"><button id="b" data-theme-button="primary" data-button-hover="slide" data-button-appearance="solid">Accept</button> <div class="shopify-section"><a id="l" class="btn btn-primary">Shop</a></div>`);
   for(const c of sheets)await p.addStyleTag({content:c});
   for(const id of ['#b','#l']){await p.hover(id);await p.waitForTimeout(30);assert.equal(await p.$eval(id,e=>getComputedStyle(e).backgroundColor),'rgb(0, 0, 208)',id+' slide end fill');assert.equal(await p.$eval(id,e=>new DOMMatrix(getComputedStyle(e,'::before').transform).m11),1);}
   await p.close();checks++;
  }
  console.log(`${checks} scroll reveal (${types.length} types) and image hover checks passed`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
